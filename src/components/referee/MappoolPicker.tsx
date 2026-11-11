import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, Search, Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { cn, fmt } from "@/lib/utils";
import { hub, invokeHub, type RefMod, type RefRoomState } from "@/lib/ref";
import { poolMapMods } from "@/lib/mappool";
import ModPicker from "@/components/referee/ModPicker";
import { MOD_COLORS, MOD_DISPLAY, modBase } from "@/lib/mods";
import {
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
  MODS_ORDER,
  STAGE_TO_CATEGORY,
  seasonOptions,
  type MapSelection,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "全部";
/** 没有当前轮次时的默认阶段 */
const DEFAULT_CATEGORY = "qualification";
/** 记住上次 pick 的赛季 / 阶段 */
const PICK_PREFS_KEY = "ref:mappoolPick";

function loadPickPrefs(): { season?: string; category?: string } {
  try {
    return JSON.parse(localStorage.getItem(PICK_PREFS_KEY) ?? "{}") as {
      season?: string;
      category?: string;
    };
  } catch {
    return {};
  }
}

function savePickPrefs(prefs: { season?: string; category?: string }) {
  try {
    localStorage.setItem(PICK_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* 隐私模式忽略 */
  }
}

function categoryLabel(value: string): string {
  return value === ALL ? "全部阶段" : (CATEGORY_LABEL[value] ?? value);
}

function slotLabel(m: MapSelection): string {
  return `${(m.selectedMods ?? "NM").toUpperCase()}${m.modPosition ?? ""}`;
}

function mapTitle(m: MapSelection): string {
  return [m.artist, m.title].filter(Boolean).join(" - ") || `谱面 #${m.beatmapId}`;
}

function fmtLength(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 按 mod 分组（组内按 mod 位排序） */
function groupByMod(list: MapSelection[]): { mod: string; items: MapSelection[] }[] {
  const buckets = new Map<string, MapSelection[]>();
  for (const m of list) {
    const key = modBase(m);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m);
  }
  const order = MODS_ORDER as readonly string[];
  return Array.from(buckets.entries())
    .sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .map(([mod, items]) => ({
      mod,
      items: items
        .slice()
        .sort(
          (a, b) =>
            Number(a.modPosition ?? 0) - Number(b.modPosition ?? 0) ||
            (a.selectedAt ?? a.createdAt ?? "").localeCompare(b.selectedAt ?? b.createdAt ?? ""),
        ),
    }));
}

interface MappoolPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RefRoomState;
}

/** 从站点公开图池一键挑图并加入本房间图池（自动带 mod，可手改）。 */
export default function MappoolPicker({ open, onOpenChange, room }: MappoolPickerProps) {
  const { settings } = useApp();
  const seasons = useMemo(() => seasonOptions(settings), [settings]);
  const defaultSeason = settings?.current_season || seasons[0]?.value || "s1";
  // 默认跟当前轮次；没有轮次时用 QUA，而不是「全部阶段」
  const defaultCategory = STAGE_TO_CATEGORY[settings?.current_season_stage ?? ""] ?? DEFAULT_CATEGORY;

  const [season, setSeason] = useState(defaultSeason);
  const [category, setCategory] = useState(defaultCategory);
  const [query, setQuery] = useState("");
  const [maps, setMaps] = useState<MapSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [requiredMods, setRequiredMods] = useState<RefMod[]>([]);
  const [allowedMods, setAllowedMods] = useState<RefMod[]>([]);
  const [busy, setBusy] = useState(false);
  /** 空图池时自动换到有图的赛季（每次打开只做一次） */
  const autoSwitchRef = useRef(false);

  // 打开时恢复上次选的赛季 / 阶段（没有记录则用当前轮次，默认 QUA）
  useEffect(() => {
    if (!open) return;
    const prefs = loadPickPrefs();
    const rememberedSeason =
      prefs.season && (seasons.length === 0 || seasons.some((s) => s.value === prefs.season))
        ? prefs.season
        : null;
    autoSwitchRef.current = false;
    setSeason(rememberedSeason ?? defaultSeason);
    setCategory(prefs.category || defaultCategory);
    setSelected(null);
    setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 拉取公开图池（approved=true）
  useEffect(() => {
    if (!open || !season) return;
    let alive = true;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ season, approved: "true" });
    if (category !== ALL) qs.set("category", category);
    void api.get<MapSelection[]>(`/api/map-selections?${qs.toString()}`).then(async (res) => {
      if (!alive) return;
      setLoading(false);
      if (!res.ok) {
        setMaps([]);
        setError(res.error.message);
        return;
      }
      const list = Array.isArray(res.data) ? res.data : [];
      setMaps(list);
      if (list.length > 0) return;
      // 这个赛季的当前阶段没图 → 换到同阶段有图的赛季（每次打开只做一次）
      if (autoSwitchRef.current) return;
      autoSwitchRef.current = true;
      for (const s of seasons) {
        if (s.value === season) continue;
        const otherQs = new URLSearchParams({ season: s.value, approved: "true" });
        if (category !== ALL) otherQs.set("category", category);
        const other = await api.get<MapSelection[]>(`/api/map-selections?${otherQs.toString()}`);
        if (!alive) return;
        if (other.ok && Array.isArray(other.data) && other.data.length > 0) {
          setSeason(s.value);
          savePickPrefs({ season: s.value, category });
          toast({
            title: `当前赛季没有 ${categoryLabel(category)} 的图，已切换到 ${s.label}`,
          });
          return;
        }
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, season, category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return maps;
    return maps.filter((m) =>
      [m.title, m.artist, m.version, m.selectedMods, m.modPosition, String(m.beatmapId), m.category]
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [maps, query]);

  const groups = useMemo(() => groupByMod(filtered), [filtered]);

  const selectMap = (m: MapSelection) => {
    setSelected(m);
    const mods = poolMapMods(m);
    setRequiredMods(mods.required);
    setAllowedMods(mods.allowed);
  };

  const submit = async () => {
    if (!selected) return;
    // 站点图池目前都是 osu! 标准谱面
    const rulesetId = 0;
    // 赛事特殊 mod 规则：选中的 mod 除 HD 外都附带 Approach Different(style=0)；
    // HD 图则单独附带 Deflate(start_size=1)
    const pickedMods = requiredMods;
    const hasHD = pickedMods.some((m) => m.acronym === "HD");
    const extraMods = hasHD
      ? [{ acronym: "DF", settings: { start_size: 1 } }]
      : [{ acronym: "AD", settings: { style: 0 } }];
    setBusy(true);
    const res = await invokeHub(
      hub.addPlaylistItem(room.id, {
        beatmap_id: Number(selected.beatmapId),
        ruleset_id: rulesetId,
        required_mods: [...pickedMods, ...extraMods],
        allowed_mods: allowedMods,
        freestyle: false,
      }),
    );
    setBusy(false);
    if (res.ok) {
      toast({ title: "已加入图池", description: `${slotLabel(selected)} · ${mapTitle(selected)}` });
      onOpenChange(false);
    } else {
      toast({ variant: "destructive", title: "加入图池失败", description: res.error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-3 rotate-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-pc-primary" /> 从公开图池 pick
          </DialogTitle>
          <DialogDescription>
            选一张图，确认 mod 后直接加入本房间图池（mod 会按图池配置自动填好，可手动改）。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={season}
            onValueChange={(v) => {
              setSeason(v);
              savePickPrefs({ season: v, category });
            }}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="赛季" />
            </SelectTrigger>
            <SelectContent>
              {(seasons.length > 0 ? seasons : [{ value: season || "s1", label: season || "s1" }]).map(
                (s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              savePickPrefs({ season, category: v });
            }}
          >
            <SelectTrigger className="h-9 w-28">
              <SelectValue placeholder="阶段" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部阶段</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--pc-faint)" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索歌名 / 谱师 / BID / mod 位"
              className="h-9 pl-8"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
          {/* 列表 */}
          <div className="max-h-[52vh] overflow-y-auto rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-2">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-(--pc-faint)">
                <Loader2 className="h-4 w-4 animate-spin" /> 加载图池…
              </p>
            ) : error ? (
              <p className="py-10 text-center text-sm text-destructive">{error}</p>
            ) : groups.length === 0 ? (
              <p className="py-10 text-center text-sm text-(--pc-faint)">
                这个阶段还没有公开的图
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.mod} className="mb-3 last:mb-0">
                  <div className="mb-1.5 flex items-center gap-2 px-1">
                    <span
                      className="rounded-lg px-2 py-0.5 text-[11px] font-bold text-white shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
                      style={{ backgroundColor: MOD_COLORS[group.mod] ?? "#666" }}
                    >
                      {MOD_DISPLAY[group.mod] ?? group.mod}
                    </span>
                    <span className="text-[10px] text-(--pc-faint)">{group.items.length} 张</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => selectMap(m)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                          selected?.id === m.id
                            ? "bg-pc-primary/10 ring-2 ring-pc-primary/40"
                            : "hover:bg-(--pc-paper)",
                        )}
                      >
                        {m.coverUrl ? (
                          <img
                            src={m.coverUrl}
                            alt=""
                            loading="lazy"
                            className="h-9 w-16 shrink-0 rounded-md border border-(--pc-border) object-cover"
                          />
                        ) : (
                          <span className="h-9 w-16 shrink-0 rounded-md border-2 border-dashed border-(--pc-border) bg-(--pc-paper)" />
                        )}
                        <span
                          className="w-14 shrink-0 rounded px-1 py-0.5 text-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
                        >
                          {slotLabel(m)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-(--pc-ink)">
                            {mapTitle(m)}
                          </span>
                          <span className="block truncate text-[10px] text-(--pc-faint)">
                            {m.version} · ★{fmt(m.starRating)} · {fmtLength(m.totalLength)} · ID{" "}
                            {m.beatmapId}
                          </span>
                        </span>
                        {m.isCustome && <Badge variant="yellow">定制</Badge>}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 详情 / mod */}
          <aside className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3">
            {!selected ? (
              <p className="py-10 text-center text-xs text-(--pc-faint)">左侧选一张图…</p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-bold text-(--pc-ink)">{mapTitle(selected)}</p>
                  <p className="mt-0.5 text-[10px] text-(--pc-faint)">
                    [{selected.version}] · ID {selected.beatmapId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{slotLabel(selected)}</Badge>
                  <Badge variant="outline">★{fmt(selected.starRating)}</Badge>
                  <Badge variant="outline">{fmtLength(selected.totalLength)}</Badge>
                  {selected.category && (
                    <Badge variant="outline">
                      {CATEGORY_LABEL[selected.category] ?? selected.category}
                    </Badge>
                  )}
                  {selected.customModName && <Badge variant="yellow">{selected.customModName}</Badge>}
                  {selected.customDTRate != null && (
                    <Badge variant="yellow">DT×{Number(selected.customDTRate)}</Badge>
                  )}
                </div>

                <div className="mt-1 grid gap-1.5">
                  <Label className="text-xs">必选 mod</Label>
                  <ModPicker value={requiredMods} onChange={setRequiredMods} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">允许 mod</Label>
                  <ModPicker value={allowedMods} onChange={setAllowedMods} />
                </div>
                <p className="text-[10px] leading-relaxed text-(--pc-faint)">
                  点选 mod；带参数的 mod 选中后可在下方调整参数。加入图池时 HD
                  图会附带 Deflate、其他图附带 Approach Different。
                </p>
                <Button variant="ghost" size="sm" onClick={() => selectMap(selected)}>
                  <RotateCcw className="h-3.5 w-3.5" /> 恢复图池配置
                </Button>
              </>
            )}
          </aside>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={!selected || busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 加入图池
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
