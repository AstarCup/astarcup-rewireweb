import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckSquare,
  CircleArrowRight,
  Clipboard,
  Download,
  Globe,
  LayoutGrid,
  LayoutList,
  MessageSquare,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { useAsync, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api, qs } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { cn, fmt, fmtInt, formatDateTime } from "@/lib/utils";
import { getDifficultyColor } from "@/lib/difficultyColor";
import { MODS_ORDER, CATEGORY_OPTIONS, CATEGORY_LABEL, seasonOptions as buildSeasonOptions, seasonLabel } from "@/lib/types";
import type { MapSelection, BeatmapInfo, MapComment, ModStatsResult, StaffStats, SeasonMappoolStat } from "@/lib/types";

const MOD_COLORS: Record<string, string> = {
  NM: "#6b7fb5",
  HD: "#f5c040",
  HR: "#e85d75",
  DT: "#a78bfa",
  FM: "#5cb8a5",
  LZ: "#ec6ba8",
  TB: "#2d2d2d",
};

const MOD_DISPLAY: Record<string, string> = {
  NM: "No Mod",
  HD: "Hidden",
  HR: "Hard Rock",
  DT: "Double Time",
  FM: "Free Mod",
  LZ: "Lazer Mod",
  TB: "Tiebreaker",
};

function modBase(m: MapSelection): string {
  return (m.selectedMods ?? "NM").split("+")[0].toUpperCase() || "NM";
}

/** 列表视图排序用的 MOD 顺序（未列出的 mod 排在最后） */
const MOD_LIST_ORDER: readonly string[] = ["NM", "HD", "HR", "DT", "LZ", "TB"];

/** 单个 MOD 分组（如 NM）的统计：数量、各属性平均值、测图与待审分解 */
function groupStats(items: MapSelection[]) {
  const avgOn = (list: MapSelection[], f: (m: MapSelection) => number | null | undefined): number => {
    const vals = list.map(f).filter((v): v is number => v != null);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avg = (f: (m: MapSelection) => number | null | undefined) => avgOn(items, f);
  const round = (n: number) => Math.round(n);
  const testing = items.filter((m) => m.padding);
  const pending = items.filter((m) => !m.approved && !m.padding);
  return {
    count: items.length,
    testing: testing.length,
    pending: pending.length,
    avgStar: avg((m) => m.starRating),
    avgStarTesting: avgOn(testing, (m) => m.starRating),
    avgStarPending: avgOn(pending, (m) => m.starRating),
    avgLen: round(avg((m) => m.totalLength)),
    avgLenTesting: round(avgOn(testing, (m) => m.totalLength)),
    avgLenPending: round(avgOn(pending, (m) => m.totalLength)),
    avgAr: avg((m) => m.ar),
    avgCs: avg((m) => m.cs),
    avgOd: avg((m) => m.od),
    avgHp: avg((m) => m.hp),
    avgBpm: avg((m) => m.bpm),
    avgMaxCombo: round(avg((m) => m.maxCombo)),
  };
}

/** 单个 MOD 分组（如 NM）的完整统计卡片（HoverCard 用）：按图状态拆成 已审核 / 测图中 / 待审 三张横向排列 */
function ModStatCard({ mod, items }: { mod: string; items: MapSelection[] }) {
  const toSub = (
    list: MapSelection[],
    title: string,
    accent: string,
  ) => {
    const g = groupStats(list);
    return {
      id: title,
      title,
      accent,
      count: list.length,
      star: g.avgStar,
      ar: g.avgAr,
      cs: g.avgCs,
      od: g.avgOd,
      hp: g.avgHp,
      bpm: g.avgBpm,
      length: g.avgLen,
      maxCombo: g.avgMaxCombo,
    };
  };
  const subs = [
    toSub(items.filter((m) => m.approved), "已审核", "#5cb8a5"),
    toSub(items.filter((m) => m.padding), "测图中", "#f5c040"),
    toSub(items.filter((m) => !m.approved && !m.padding), "待审", "#6b7fb5"),
  ];
  const s = groupStats(items);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span
          className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: MOD_COLORS[mod] ?? "#666" }}
        >
          {MOD_DISPLAY[mod] ?? mod}
        </span>
        <span className="flex gap-2">
          <Badge variant="primary">{fmtInt(s.count)} 张</Badge>
          <Badge variant="yellow">T {fmtInt(s.testing)}</Badge>
          <Badge variant="blue">P {fmtInt(s.pending)}</Badge>
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subs.map((sub) => (
          <StatSubCard key={sub.id} {...sub} />
        ))}
      </div>
    </div>
  );
}

/** 单个状态（已审核 / 测图中 / 待审）的统计子卡片 */
function StatSubCard({
  title,
  accent,
  count,
  star,
  ar,
  cs,
  od,
  hp,
  bpm,
  length,
  maxCombo,
}: {
  title: string;
  accent: string;
  count: number;
  star: number;
  ar: number;
  cs: number;
  od: number;
  hp: number;
  bpm: number;
  length: number;
  maxCombo: number;
}) {
  const rows: { label: string; value: number }[] = [
    { label: "平均星数", value: star },
    { label: "平均 AR", value: ar },
    { label: "平均 CS", value: cs },
    { label: "平均 OD", value: od },
    { label: "平均 HP", value: hp },
    { label: "平均 BPM", value: bpm },
    { label: "平均长度", value: length },
    { label: "平均 MaxCombo", value: maxCombo },
  ];
  return (
    <div className="min-w-48 flex-1 rounded-xl bg-(--pc-paper) p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-bold text-(--pc-ink)" style={{ color: accent }}>
          {title}
        </span>
        <Badge variant="outline">{fmtInt(count)} 张</Badge>
      </div>
      <div className="space-y-1 text-xs text-(--pc-slate)">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <span>{r.label}</span>
            <span className="font-bold text-(--pc-ink)">{fmt(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 单个阶段（如 QUA）的图池统计卡片：按图状态拆成 已审核 / 测图中 / 待审 三张 */
function StageStatCard({ row }: { row: SeasonMappoolStat }) {
  const subs: {
    id: string;
    title: string;
    accent: string;
    count: number;
    star: number;
    ar: number;
    cs: number;
    od: number;
    hp: number;
    bpm: number;
    length: number;
    maxCombo: number;
  }[] = [
      {
        id: "approved",
        title: "已审核",
        accent: "#5cb8a5",
        count: row.count,
        star: row.avgStarRating,
        ar: row.avgAr,
        cs: row.avgCs,
        od: row.avgOd,
        hp: row.avgHp,
        bpm: row.avgBpm,
        length: row.avgLength,
        maxCombo: row.avgMaxCombo,
      },
      {
        id: "testing",
        title: "测图中",
        accent: "#f5c040",
        count: row.testingCount,
        star: row.avgStarRatingTesting,
        ar: row.avgArTesting,
        cs: row.avgCsTesting,
        od: row.avgOdTesting,
        hp: row.avgHpTesting,
        bpm: row.avgBpmTesting,
        length: row.avgLengthTesting,
        maxCombo: row.avgMaxComboTesting,
      },
      {
        id: "pending",
        title: "待审",
        accent: "#6b7fb5",
        count: row.pendingCount,
        star: row.avgStarRatingPending,
        ar: row.avgArPending,
        cs: row.avgCsPending,
        od: row.avgOdPending,
        hp: row.avgHpPending,
        bpm: row.avgBpmPending,
        length: row.avgLengthPending,
        maxCombo: row.avgMaxComboPending,
      },
    ];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-(--pc-ink)">{row.label}</span>
        <span className="flex gap-2">
          <Badge variant="primary">{fmtInt(row.count)} 张</Badge>
          <Badge variant="yellow">T {fmtInt(row.testingCount)}</Badge>
          <Badge variant="blue">P {fmtInt(row.pendingCount)}</Badge>
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subs.map((s) => (
          <StatSubCard key={s.id} {...s} />
        ))}
      </div>
    </div>
  );
}

const STAT_FIELDS: { key: string; label: string }[] = [
  { key: "star", label: "星数 ★" },
  { key: "ar", label: "AR" },
  { key: "cs", label: "CS" },
  { key: "od", label: "OD" },
  { key: "hp", label: "HP" },
  { key: "bpm", label: "BPM" },
  { key: "length", label: "时长 (s)" },
  { key: "maxCombo", label: "MaxCombo" },
];

function starColor(s: number | null): string {
  return getDifficultyColor(s ?? 0);
}

function fmtLength(seconds: number | null): string {
  if (seconds == null) return "-";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function osuMapUrl(s: MapSelection): string {
  if (s.url) return s.url;
  return `https://osu.ppy.sh/b/${s.beatmapId}`;
}

function sayobotUrl(s: MapSelection): string {
  return `https://dl.sayobot.cn/beatmaps/download/full/${s.beatmapsetId ?? s.beatmapId}`;
}

function groupMaps(list: MapSelection[]): { mod: string; items: MapSelection[] }[] {
  const map = new Map<string, MapSelection[]>();
  for (const m of list) {
    const key = modBase(m);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  const order = MODS_ORDER as readonly string[];
  const keys = Array.from(map.keys()).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return keys.map((mod) => ({
    mod,
    items: map
      .get(mod)!
      .slice()
      .sort((a, b) => {
        const pa = Number(a.modPosition ?? 0);
        const pb = Number(b.modPosition ?? 0);
        if (pa !== pb) return pa - pb;
        return (a.selectedAt ?? a.createdAt ?? "").localeCompare(b.selectedAt ?? b.createdAt ?? "");
      }),
  }));
}

function CommentDialog({
  open,
  onOpenChange,
  map,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  map: MapSelection | null;
}) {
  const [comments, setComments] = useState<MapComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [postBusy, setPostBusy] = useState(false);
  const [delBusy, setDelBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !map) return;
    setLoading(true);
    void api
      .get<Record<string, MapComment[]>>(
        "/api/map-selections/comments" + qs({ mapSelectionIds: String(map.id) }),
      )
      .then((res) => {
        setLoading(false);
        if (res.ok) {
          setComments(Object.values(res.data).flat());
        } else {
          setComments([]);
        }
      });
  }, [open, map]);

  const add = async () => {
    if (!map || !text.trim()) return;
    setPostBusy(true);
    const res = await api.post(`/api/map-selections/${map.id}/comments`, {
      comment: text.trim(),
    });
    setPostBusy(false);
    if (res.ok) {
      setText("");
      toast({ title: "评论已添加" });
      const c = await api.get<MapComment[]>(
        "/api/map-selections/comments" + qs({ mapSelectionIds: String(map.id) }),
      );
      if (c.ok) setComments(Object.values(c.data).flat());
    } else {
      toast({ variant: "destructive", title: "评论失败" });
    }
  };

  const remove = async (id: number) => {
    setDelBusy(id);
    const res = await api.delete(`/api/map-selections/comments/${id}`);
    setDelBusy(null);
    if (res.ok) {
      setComments((cs) => cs.filter((c) => c.id !== id));
      toast({ title: "评论已删除" });
    } else {
      toast({ variant: "destructive", title: "删除评论失败" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>选图评论</DialogTitle>
          <DialogDescription>{map ? `${map.title} - ${map.version}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loading ? (
            <p className="py-4 text-center text-xs text-(--pc-faint)">加载评论中…</p>
          ) : comments.length === 0 ? (
            <p className="py-4 text-center text-xs text-(--pc-faint)">暂无评论。</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-xl border-2 border-(--pc-border) p-3">
                <div className="flex items-start gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={c.avatarUrl || `https://a.ppy.sh/${c.userId}`}
                      alt={c.username}
                    />
                    <AvatarFallback>{c.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-(--pc-ink)">{c.username}</span>
                      <button
                        onClick={() => void remove(c.id)}
                        disabled={delBusy === c.id}
                        className="text-xs text-[#e85d75] hover:underline"
                      >
                        {delBusy === c.id ? "…" : "删除"}
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-(--pc-slate)">{c.comment}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <Separator />
          <div className="grid gap-1.5">
            <Label>添加评论</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="写下评论…"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">关闭</Button>
          </DialogClose>
          <Button variant="primary" onClick={add} disabled={postBusy || !text.trim()}>
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchApproveDialog({
  open,
  onOpenChange,
  maps,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  maps: MapSelection[];
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量过审确认</DialogTitle>
          <DialogDescription>将下列 {maps.length} 张选图标记为已审核。</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-xl border-2 border-(--pc-border)">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-(--pc-paper)">
              <tr className="border-b-2 border-(--pc-border)">
                <th className="px-3 py-2 font-bold text-(--pc-slate)">MOD</th>
                <th className="px-3 py-2 font-bold text-(--pc-slate)">歌曲</th>
                <th className="px-3 py-2 font-bold text-(--pc-slate)">难度</th>
                <th className="px-3 py-2 font-bold text-(--pc-slate)">提名者</th>
              </tr>
            </thead>
            <tbody>
              {maps.map((m) => (
                <tr key={m.id} className="border-b border-(--pc-border)/60">
                  <td className="px-3 py-2">
                    <span
                      className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
                    >
                      {`${modBase(m)}${m.modPosition ?? ""}`}
                    </span>
                    {m.selectedMods?.toUpperCase() === "DT" && m.customDTRate != null && (
                      <span className="ml-1 text-xs font-bold text-[#a78bfa]">
                        x{Number(m.customDTRate).toFixed(2)}
                      </span>
                    )}
                    {m.customModName && (
                      <span className="ml-1 text-xs font-bold text-(--pc-slate)">
                        {m.customModName}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-bold text-(--pc-ink)">{m.title}</td>
                  <td className="px-3 py-2 text-(--pc-slate)">{m.version}</td>
                  <td className="px-3 py-2 text-(--pc-faint)">
                    {m.selectedByUsername || m.selectedBy || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? "处理中…" : `确认过审 ${maps.length} 张`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustStatsDialog({
  open,
  onOpenChange,
  map,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  map: MapSelection | null;
  onSaved: () => void;
}) {
  const { settings } = useApp();
  const seasonOptions = buildSeasonOptions(settings);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("");
  const [mods, setMods] = useState("NM");
  const [modPosition, setModPosition] = useState("");
  const [customModName, setCustomModName] = useState("");
  const [customDTRate, setCustomDTRate] = useState("");
  const [comment, setComment] = useState("");
  const [mapType, setMapType] = useState<"normal" | "original" | "custom">("normal");

  useEffect(() => {
    if (!map) return;
    setValues({
      star: map.starRating != null ? String(map.starRating) : "",
      ar: map.ar != null ? String(map.ar) : "",
      cs: map.cs != null ? String(map.cs) : "",
      od: map.od != null ? String(map.od) : "",
      hp: map.hp != null ? String(map.hp) : "",
      bpm: map.bpm != null ? String(map.bpm) : "",
      length: map.totalLength != null ? String(map.totalLength) : "",
      maxCombo: map.maxCombo != null ? String(map.maxCombo) : "",
    });
    setSeason(map.season ?? "");
    setCategory(map.category ?? "");
    setMods(modBase(map));
    setModPosition(map.modPosition != null ? String(map.modPosition) : "");
    setCustomModName(map.customModName ?? "");
    setCustomDTRate(map.customDTRate != null ? String(map.customDTRate) : "");
    setComment(map.comment ?? "");
    setMapType(map.isCustome ? "custom" : map.isOrigin ? "original" : "normal");
  }, [map]);

  const save = async () => {
    if (!map) return;
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const body: Record<string, unknown> = {
      starRating: num(values.star),
      ar: num(values.ar),
      cs: num(values.cs),
      od: num(values.od),
      hp: num(values.hp),
      bpm: num(values.bpm),
      totalLength: num(values.length),
      maxCombo: num(values.maxCombo),
    };
    // 赛季/阶段/MOD/MOD 位仅当发生变化时才提交，避免覆盖自定义 MOD 配置
    if (season !== (map.season ?? "")) body.season = season || null;
    if (category !== (map.category ?? "")) body.category = category || null;
    if (mods !== modBase(map)) body.selectedMods = mods;
    if (modPosition !== (map.modPosition != null ? String(map.modPosition) : "")) {
      body.modPosition = modPosition.trim() === "" ? null : Number(modPosition);
    }
    if (customModName !== (map.customModName ?? "")) body.customModName = customModName || null;
    if (customDTRate !== (map.customDTRate != null ? String(map.customDTRate) : "")) {
      body.customDTRate = customDTRate.trim() === "" ? null : Number(customDTRate);
    }
    if (comment !== (map.comment ?? "")) body.comment = comment || null;
    const origType = map.isCustome ? "custom" : map.isOrigin ? "original" : "normal";
    if (mapType !== origType) {
      body.isCustome = mapType === "custom";
      body.isOrigin = mapType === "original";
    }
    setBusy(true);
    const res = await api.patch(`/api/map-selections/${map.id}`, body);
    setBusy(false);
    if (res.ok) {
      toast({ title: "参数已更新" });
      onOpenChange(false);
      onSaved();
    } else {
      toast({ variant: "destructive", title: "更新失败" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" style={{ rotate: "0deg" }}>
        <DialogHeader>
          <DialogTitle>调整参数</DialogTitle>
          <DialogDescription>{map ? `${map.title} - ${map.version}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          <div className="grid gap-1.5">
            <Label>赛季</Label>
            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger>
                <SelectValue placeholder="选择赛季" />
              </SelectTrigger>
              <SelectContent>
                {seasonOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>阶段</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择阶段" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>MOD</Label>
            <Select value={mods} onValueChange={setMods}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODS_ORDER.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>MOD 位</Label>
            <Input value={modPosition} onChange={(e) => setModPosition(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STAT_FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label>{f.label}</Label>
              <Input
                type="number"
                step="any"
                value={values[f.key]}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1.5">
            <Label>自定义 Mod 名（可选）</Label>
            <Input
              value={customModName}
              onChange={(e) => setCustomModName(e.target.value)}
              placeholder="如 LZ"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>自定义 DT 倍率（可选）</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={customDTRate}
              onChange={(e) => setCustomDTRate(e.target.value)}
              placeholder="如 1.5"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>类型</Label>
            <Select
              value={mapType}
              onValueChange={(v) => setMapType(v as "normal" | "original" | "custom")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">普通谱面</SelectItem>
                <SelectItem value="original">原创图</SelectItem>
                <SelectItem value="custom">定制图</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>备注</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="可选备注"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MapSelectionManagement() {
  const { user, settings } = useApp();
  // 与图池页共用 mappool_init：首次载入自动同步到当前赛季，之后保持用户选择
  const [init] = useState(() => {
    const done = localStorage.getItem("mappool_init") === "true";
    try {
      localStorage.setItem("mappool_init", "true");
    } catch {
      /* ignore */
    }
    return done;
  });
  const [season, setSeason] = useState<string>(
    () => localStorage.getItem("mappool_season") ?? "",
  );
  const [category, setCategory] = useState<string>(
    () => localStorage.getItem("mappool_category") ?? "qualification",
  );
  const [modFilter, setModFilter] = useState("全部");
  const [paddingFilter, setPaddingFilter] = useState("全部");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"card" | "table">("card");
  const [visible, setVisible] = useState(60);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [commentsByMap, setCommentsByMap] = useState<Record<string, MapComment[]>>({});
  const [statsOpen, setStatsOpen] = useState(false);

  const seasonOptions = buildSeasonOptions(settings);

  // 拉取后台统计（用于阶段统计卡片 / HoverCard）
  const { data: staffStats, run: loadStats } = useAsync<StaffStats>();
  useEffect(() => {
    void loadStats(() => api.get<StaffStats>("/api/staff/stats"));
  }, [loadStats]);

  // 当前选中赛季 + 阶段对应的统计数据（类别为“全部”时展示该赛季全部阶段）
  const seasonStatRows = staffStats?.seasonMappoolStats?.[season] ?? [];
  const statRows = useMemo(() => {
    if (seasonStatRows.length === 0) return [];
    if (category === "全部") return seasonStatRows;
    return seasonStatRows.filter((r) => r.category === category);
  }, [seasonStatRows, category]);

  // 仅在第一次载入时同步赛季到当前赛季（未设置时取最新），并持久化；之后保持用户选择
  useEffect(() => {
    if (init) return;
    const cur = settings?.current_season;
    if (cur && seasonOptions.some((o) => o.value === cur)) {
      localStorage.setItem("mappool_season", cur);
      setSeason(cur);
    } else if (seasonOptions.length > 0) {
      const fallback = seasonOptions[seasonOptions.length - 1].value;
      localStorage.setItem("mappool_season", fallback);
      setSeason(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, seasonOptions, init]);

  const seasonReady = init || !!settings?.seasons || !!settings?.current_season;

  const { data, loading, error, run } = useAsync<MapSelection[]>();
  const load = useCallback(
    () =>
      run(() =>
        api.get<MapSelection[]>(
          "/api/map-selections" +
          qs({
            season: season || undefined,
            category: category === "全部" ? undefined : category,
          }),
        ),
      ),
    [run, season, category],
  );

  useEffect(() => {
    if (!seasonReady) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonReady, load]);

  // Batch-fetch comments for the visible pool.
  useEffect(() => {
    const maps = data ?? [];
    if (maps.length === 0) {
      setCommentsByMap({});
      return;
    }
    void api
      .get<Record<string, MapComment[]>>(
        "/api/map-selections/comments" +
        qs({ mapSelectionIds: maps.map((m) => m.id).join(",") }),
      )
      .then((res) => {
        if (res.ok) setCommentsByMap(res.data);
      });
  }, [data]);

  // 搜索支持：普通文字 / BID / SID，以及参数过滤（cs/ar/od/hp/bpm/时长/maxcombo/star，运算符 > < = >= <=）与 bid:/sid: 前缀；用空格或分号分隔多个条件，如 ar>6;cs=5;bid:114514
  const filtered = useMemo(() => {
    const maps = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) {
      return maps.filter((m) => {
        if (modFilter !== "全部" && modBase(m) !== modFilter) return false;
        if (paddingFilter === "测图中" && !m.padding) return false;
        if (paddingFilter === "非测图" && m.padding) return false;
        return true;
      });
    }

    const paramRe = /^(cs|ar|od|hp|bpm|length|时长|maxcombo|star)\s*([><=]+)\s*([\d.]+)$/;
    const keyRe = /^(bid|sid)\s*[:：]\s*([\d]+)$/;
    const seasonRe = /^season\s*[:：]\s*([\w]+)$/;
    const paramTokens: { key: string; op: string; val: number }[] = [];
    const keyTokens: { key: "bid" | "sid"; val: string }[] = [];
    const seasonTokens: string[] = [];
    const textTokens: string[] = [];
    for (const tok of q.split(/[\s;]+/)) {
      if (!tok) continue;
      const pm = tok.match(paramRe);
      if (pm) {
        paramTokens.push({ key: pm[1], op: pm[2], val: Number(pm[3]) });
        continue;
      }
      const km = tok.match(keyRe);
      if (km) {
        keyTokens.push({ key: km[1] as "bid" | "sid", val: km[2] });
        continue;
      }
      const sm = tok.match(seasonRe);
      if (sm) {
        seasonTokens.push(sm[1].toLowerCase());
        continue;
      }
      textTokens.push(tok);
    }

    const fieldOf = (key: string, m: MapSelection): number | null | undefined => {
      switch (key) {
        case "cs": return m.cs;
        case "ar": return m.ar;
        case "od": return m.od;
        case "hp": return m.hp;
        case "bpm": return m.bpm;
        case "length":
        case "时长": return m.totalLength;
        case "maxcombo": return m.maxCombo;
        case "star": return m.starRating;
        default: return null;
      }
    };
    const cmp = (v: number, op: string, target: number): boolean => {
      switch (op) {
        case ">": return v > target;
        case "<": return v < target;
        case ">=": return v >= target;
        case "<=": return v <= target;
        case "=":
        case "==": return v === target;
        default: return false;
      }
    };

    return maps.filter((m) => {
      if (modFilter !== "全部" && modBase(m) !== modFilter) return false;
      if (paddingFilter === "测图中" && !m.padding) return false;
      if (paddingFilter === "非测图" && m.padding) return false;
      // 参数过滤：任一不满足即排除
      for (const p of paramTokens) {
        const v = fieldOf(p.key, m);
        if (v == null || !cmp(v, p.op, p.val)) return false;
      }
      // bid:/sid: 过滤：任一不匹配即排除
      for (const k of keyTokens) {
        const sv =
          k.key === "bid" ? String(m.beatmapId) : String(m.beatmapsetId ?? "");
        if (sv !== k.val) return false;
      }
      // season: 过滤：任一不匹配即排除
      for (const s of seasonTokens) {
        if ((m.season ?? "").toLowerCase() !== s) return false;
      }
      if (textTokens.length === 0) return true;
      const hay = [
        m.title,
        m.artist,
        m.version,
        m.creator,
        m.selectedMods,
        m.modPosition,
        `${modBase(m)}${m.modPosition ?? ""}`,
        m.comment,
        String(m.beatmapId),
        String(m.beatmapsetId ?? ""),
        m.selectedByUsername,
        m.selectedBy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return textTokens.every((t) => hay.includes(t));
    });
  }, [data, modFilter, paddingFilter, search]);

  // 懒加载：筛选条件变化时重置为初始条数
  useEffect(() => {
    setVisible(60);
  }, [filtered]);

  // 排序：先按 MOD 顺序（NM/HD/HR/DT/LZ/TB），再按 MOD 位，最后按添加时间
  const sorted = useMemo(() => {
    const maps = filtered.slice();
    const order = MOD_LIST_ORDER;
    return maps.sort((a, b) => {
      const ia = order.indexOf(modBase(a));
      const ib = order.indexOf(modBase(b));
      if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      const pa = Number(a.modPosition ?? 0);
      const pb = Number(b.modPosition ?? 0);
      if (pa !== pb) return pa - pb;
      return (a.selectedAt ?? a.createdAt ?? "").localeCompare(
        b.selectedAt ?? b.createdAt ?? "",
      );
    });
  }, [filtered]);

  const lazyList = useMemo(() => sorted.slice(0, visible), [sorted, visible]);
  const groups = useMemo(() => groupMaps(lazyList), [lazyList]);

  const modFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of data ?? []) {
      const k = modBase(m);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const order = MODS_ORDER as readonly string[];
    return [
      { key: "全部", label: `全部 (${data?.length ?? 0})` },
      ...Array.from(counts.entries())
        .sort((a, b) => (order.indexOf(a[0]) - order.indexOf(b[0])))
        .map(([k, n]) => ({ key: k, label: `${MOD_DISPLAY[k] ?? k} ${n} 张` })),
    ];
  }, [data]);

  const paddingCount = data?.filter((m) => m.padding).length ?? 0;

  const unapprovedFiltered = filtered.filter((m) => !m.approved);
  const allSelected = unapprovedFiltered.length > 0 && unapprovedFiltered.every((m) => selectedIds.has(m.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const m of unapprovedFiltered) next.delete(m.id);
      } else {
        for (const m of unapprovedFiltered) next.add(m.id);
      }
      return next;
    });
  };

  // Add selection dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [bmUrl, setBmUrl] = useState("");
  const [parseResult, setParseResult] = useState<BeatmapInfo[]>([]);
  const [parseBusy, setParseBusy] = useState(false);
  const [picked, setPicked] = useState("");
  const [mods, setMods] = useState<string>(MODS_ORDER[0]);
  const [modPosition, setModPosition] = useState("");
  const [comment, setComment] = useState("");
  const [approved, setApproved] = useState(false);
  const [addSeason, setAddSeason] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [mapType, setMapType] = useState<"normal" | "original" | "custom">("normal");
  const [modStats, setModStats] = useState<ModStatsResult["modStats"] | null>(null);
  const [calcBusy, setCalcBusy] = useState(false);
  const [customModName, setCustomModName] = useState("");
  const [customDTRate, setCustomDTRate] = useState("");
  const [formStats, setFormStats] = useState<Record<string, string>>({
    star: "",
    ar: "",
    cs: "",
    od: "",
    hp: "",
    bpm: "",
    length: "",
    maxCombo: "",
  });

  const parseUrl = async () => {
    if (!bmUrl.trim()) return;
    setParseBusy(true);
    const res = await api.post<BeatmapInfo[]>("/api/beatmaps/parse-url", {
      url: bmUrl.trim(),
      osu_id: user?.osuId ?? "",
    });
    setParseBusy(false);
    if (res.ok) {
      setParseResult(res.data);
      setPicked(res.data[0] ? String(res.data[0].id) : "");
    } else {
      setParseResult([]);
      toast({ variant: "destructive", title: "解析失败" });
    }
  };

  const pickedInfo = parseResult.find((p) => String(p.id) === picked);

  // 选中难度时用解析结果初始化表单参数
  useEffect(() => {
    if (!pickedInfo) return;
    setFormStats({
      star: pickedInfo.star_rating != null ? String(pickedInfo.star_rating) : "",
      ar: pickedInfo.ar != null ? String(pickedInfo.ar) : "",
      cs: pickedInfo.cs != null ? String(pickedInfo.cs) : "",
      od: pickedInfo.od != null ? String(pickedInfo.od) : "",
      hp: pickedInfo.hp != null ? String(pickedInfo.hp) : "",
      bpm: pickedInfo.bpm != null ? String(pickedInfo.bpm) : "",
      length: pickedInfo.total_length != null ? String(pickedInfo.total_length) : "",
      maxCombo: pickedInfo.maxCombo != null ? String(pickedInfo.maxCombo) : "",
    });
  }, [pickedInfo]);


  // 解析后即时重复检测：相同 BID / SID / 歌曲名
  const duplicateInfo = useMemo(() => {
    if (!pickedInfo) return null;
    const maps = data ?? [];
    const sameBid = maps.filter((m) => m.beatmapId === pickedInfo.id).length;
    const sameSid = maps.filter(
      (m) => pickedInfo.beatmapsetId != null && m.beatmapsetId === pickedInfo.beatmapsetId,
    ).length;
    const sameTitle = maps.filter(
      (m) => pickedInfo.title && m.title === pickedInfo.title,
    ).length;
    const parts: string[] = [];
    if (sameBid > 0) parts.push(`BID 重复 ${sameBid} 张`);
    if (sameSid > 0) parts.push(`SID 重复 ${sameSid} 张`);
    if (sameTitle > 0) parts.push(`歌曲重复 ${sameTitle} 张`);
    return parts.length > 0 ? parts.join("，") : null;
  }, [pickedInfo, data]);

  const calculateModStats = async () => {
    if (!pickedInfo) return;
    setCalcBusy(true);
    const res = await api.post<ModStatsResult>("/api/beatmaps/mod-stats", {
      beatmap: pickedInfo,
      mods,
      customSettings: {
        customModName: customModName || null,
        customDTRate: customDTRate ? Number(customDTRate) : null,
      },
    });
    setCalcBusy(false);
    if (res.ok) {
      setModStats(res.data.modStats);
      const s = res.data.modStats;
      setFormStats({
        star: String(s.starRating),
        ar: String(s.ar),
        cs: String(s.cs),
        od: String(s.od),
        hp: String(s.hp),
        bpm: String(s.bpm),
        length: String(s.totalLength),
        maxCombo: String(s.maxCombo),
      });
      toast({ title: "Mod 属性已计算" });
    } else {
      toast({ variant: "destructive", title: "计算失败" });
    }
  };

  const addSelection = async () => {
    if (!pickedInfo) {
      toast({ title: "请先解析并选择难度" });
      return;
    }
    setBusy("add");
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const res = await api.post("/api/map-selections", {
      selectedBy: user?.osuId ?? "",
      url: pickedInfo.url ?? bmUrl,
      selectedMods: mods,
      modPosition: modPosition ? Number(modPosition) : null,
      comment: comment || null,
      approved,
      moddedStats: {
        ar: num(formStats.ar),
        cs: num(formStats.cs),
        od: num(formStats.od),
        hp: num(formStats.hp),
        bpm: num(formStats.bpm),
        totalLength: num(formStats.length),
        maxCombo: num(formStats.maxCombo),
        starRating: num(formStats.star),
      },
      customModName: customModName || undefined,
      customDTRate: customDTRate ? Number(customDTRate) : undefined,
      beatmapId: pickedInfo.id,
      beatmapsetId: pickedInfo.beatmapsetId,
      season: addSeason || null,
      category: addCategory || null,
      isOrigin: mapType === "original",
      isCustome: mapType === "custom",
    });
    setBusy("");
    if (res.ok) {
      toast({ title: "选图已添加" });
      setAddOpen(false);
      setBmUrl("");
      setParseResult([]);
      setPicked("");
      setComment("");
      setModPosition("");
      setApproved(false);
      setModStats(null);
      setCustomModName("");
      setCustomDTRate("");
      void load();
    } else {
      toast({ variant: "destructive", title: "添加失败" });
    }
  };

  const toggleApproved = async (m: MapSelection) => {
    setBusy(`approved-${m.id}`);
    const res = await api.patch(`/api/map-selections/${m.id}`, { approved: !m.approved });
    setBusy("");
    if (res.ok) void load();
    else toast({ variant: "destructive", title: "更新失败" });
  };

  const togglePadding = async (m: MapSelection) => {
    setBusy(`padding-${m.id}`);
    const res = await api.patch(`/api/map-selections/${m.id}`, { padding: !m.padding });
    setBusy("");
    if (res.ok) void load();
    else toast({ variant: "destructive", title: "更新失败" });
  };

  const removeMap = async (m: MapSelection) => {
    setBusy(`delete-${m.id}`);
    const res = await api.delete(`/api/map-selections/${m.id}`);
    setBusy("");
    if (res.ok) {
      toast({ title: "选图已删除" });
      void load();
    } else {
      toast({ variant: "destructive", title: "删除失败" });
    }
  };

  const confirmBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBusy("bulk");
    const res = await api.post<{ total: number; success: number; failed: number }>(
      "/api/map-selections/bulk-approve",
      { selectionIds: Array.from(selectedIds), approved: true },
    );
    setBusy("");
    if (res.ok) {
      toast({ title: `批量完成：成功 ${res.data.success} / 总 ${res.data.total}` });
      setSelectedIds(new Set());
      setBatchOpen(false);
      void load();
    } else {
      toast({ variant: "destructive", title: "批量操作失败" });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyBid = (m: MapSelection) => {
    void navigator.clipboard
      .writeText(String(m.beatmapId))
      .then(() => toast({ title: "已复制 BID", description: String(m.beatmapId) }))
      .catch(() => toast({ variant: "destructive", title: "复制失败" }));
  };

  const [commentTarget, setCommentTarget] = useState<MapSelection | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<MapSelection | null>(null);

  if (!seasonReady || loading) return <LoadingBlock label="加载选图中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  const selectedMaps = data.filter((m) => selectedIds.has(m.id));

  const statCell = (label: string, value: string, color?: string) => (
    <div className="rounded-xl bg-(--pc-paper) px-2 py-1.5 text-center">
      <p className="text-[10px] text-(--pc-faint)">{label}</p>
      <p className="font-sans text-sm font-bold" style={{ color: color ?? "var(--pc-ink)" }}>
        {value}
      </p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-(--pc-ink)">选图管理</h2>
          <p className="mt-1 text-xs text-(--pc-faint)">共 {data.length} 张选图 · {paddingCount} 张审图中</p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o);
            if (o) {
              setAddSeason(seasonOptions[seasonOptions.length - 1]?.value ?? "");
            } else {
              setModStats(null);
              setCustomModName("");
              setCustomDTRate("");
              setAddSeason("");
              setMapType("normal");
              setFormStats({ star: "", ar: "", cs: "", od: "", hp: "", bpm: "", length: "", maxCombo: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="primary">+ 添加选图</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl" style={{ rotate: "0deg" }}>
            <DialogHeader>
              <DialogTitle>添加选图</DialogTitle>
              <DialogDescription>粘贴 osu 谱面链接，解析后选择难度与 MOD。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 overflow-y-auto pr-1 max-h-[62vh]">
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>赛季</Label>
                  <Select value={addSeason} onValueChange={setAddSeason}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择赛季" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasonOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>阶段</Label>
                  <Select value={addCategory} onValueChange={setAddCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择阶段" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>类型</Label>
                  <Select
                    value={mapType}
                    onValueChange={(v) => setMapType(v as "normal" | "original" | "custom")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">普通谱面</SelectItem>
                      <SelectItem value="original">原创图</SelectItem>
                      <SelectItem value="custom">定制图</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 grid gap-1.5">
                  <Label>谱面链接</Label>
                  <Input
                    value={bmUrl}
                    onChange={(e) => setBmUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void parseUrl();
                    }}
                    placeholder="https://osu.ppy.sh/b/..."
                  />
                </div>
                <Button variant="teal" onClick={parseUrl} disabled={parseBusy || !bmUrl.trim()}>
                  {parseBusy ? "解析中…" : "解析"}
                </Button>
              </div>
              {parseResult.length > 0 && (
                <div className="grid gap-1.5">
                  <Label>选择难度</Label>
                  <Select value={picked} onValueChange={setPicked}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parseResult.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.title} - {b.version} ★{fmt(b.star_rating)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {pickedInfo && (
                <div className="flex items-center gap-3 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3">
                  {pickedInfo.cover_url ? (
                    <img
                      src={pickedInfo.cover_url}
                      alt={pickedInfo.title}
                      className="h-16 w-28 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-28 shrink-0 place-items-center rounded-lg bg-[#f5c040]/30 text-xs font-bold text-(--pc-ink)">
                      无封面
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-sm text-(--pc-ink)">
                      {[pickedInfo.artist, pickedInfo.title].filter(Boolean).join(" - ") || "未知曲目"}
                    </p>
                    <p className="truncate text-xs text-(--pc-faint)">
                      [{pickedInfo.version}] by {pickedInfo.creator ?? "-"}
                    </p>
                    {pickedInfo.star_rating != null && (
                      <p className="mt-1 text-xs font-bold text-[#e85d75]">
                        ★ {fmt(pickedInfo.star_rating)}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {duplicateInfo && (
                <p className="rounded-xl border-2 border-[#f5c040] bg-[#f5c040]/20 px-3 py-2 text-xs font-bold text-(--pc-ink)">
                  ⚠ 检测到重复选图：{duplicateInfo}
                </p>
              )}
              {pickedInfo && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>MOD</Label>
                    <Select value={mods} onValueChange={setMods}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODS_ORDER.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>MOD 位置</Label>
                    <Input value={modPosition} onChange={(e) => setModPosition(e.target.value)} />
                  </div>
                </div>
              )}
              {pickedInfo && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {STAT_FIELDS.map((f) => (
                      <div key={f.key} className="grid gap-1.5">
                        <Label>{f.label}</Label>
                        <Input
                          type="number"
                          step="any"
                          value={formStats[f.key]}
                          onChange={(e) =>
                            setFormStats((s) => ({ ...s, [f.key]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>自定义 Mod 名（可选）</Label>
                      <Input
                        value={customModName}
                        onChange={(e) => setCustomModName(e.target.value)}
                        placeholder="如 LZ"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>自定义 DT 倍率（可选）</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customDTRate}
                        onChange={(e) => setCustomDTRate(e.target.value)}
                        placeholder="如 1.5"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="teal" onClick={calculateModStats} disabled={calcBusy}>
                      {calcBusy ? "计算中…" : "计算 MOD 属性"}
                    </Button>
                    {modStats && (
                      <span className="text-xs text-(--pc-slate)">
                        星级 {fmt(modStats.starRating)} · AR {fmt(modStats.ar)} · CS {fmt(modStats.cs)} · OD{" "}
                        {fmt(modStats.od)}
                      </span>
                    )}
                  </div>
                </>
              )}
              <div className="grid gap-1.5">
                <Label>备注</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="可选备注"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button variant="primary" onClick={addSelection} disabled={busy === "add"}>
                {busy === "add" ? "提交中…" : "添加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 第一行：搜索与视图切换 */}
      <div className="flex items-center gap-3">
        <HoverCard openDelay={150} closeDelay={0}>
          <HoverCardTrigger asChild>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索 BID / 曲名 / 谱师…"
              className="flex-1"
            />
          </HoverCardTrigger>
          <HoverCardContent side="bottom" align="start" className="w-80">
            <p className="mb-1.5 text-xs font-bold text-(--pc-ink)">搜索支持的参数</p>
            <ul className="space-y-1 text-xs leading-relaxed text-(--pc-slate)">
              <li>• 数字：BID / SID（谱面集 ID）</li>
              <li>• 文字：曲名、艺术家、难度、谱师</li>
              <li>• MOD：NM、HD、HR、DT、LZ、TB…</li>
              <li>• 组合：MOD + 位号，如 NM1、HD2</li>
              <li>• 属性：cs/ar/od/hp/bpm/时长/maxcombo/star + 运算符，如 cs=6、ar&gt;8、bpm&lt;200</li>
              <li>• 前缀：bid:、sid:、season:，如 bid:114514、season:s2</li>
              <li>• 分隔：空格或分号组合多种条件，如 ar&gt;6;cs=5;season:s2;songtitle</li>
              <li>• 其他：备注、提名者用户名</li>
            </ul>
          </HoverCardContent>
        </HoverCard>
        <div className="flex items-center gap-1 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-1 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
          {(["card", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
                view === v
                  ? "bg-[#6b7fb5] text-[#fdf6ee]"
                  : "bg-transparent text-(--pc-slate) hover:text-(--pc-ink)",
              )}
            >
              {v === "card" ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              {v === "card" ? "卡片" : "列表"}
            </button>
          ))}
        </div>
      </div>

      {/* 第二行：筛选条件 */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">赛季</Label>
          <Select
            value={season}
            onValueChange={(v) => {
              localStorage.setItem("mappool_season", v);
              setSeason(v);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {seasonOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">类别</Label>
          <Select
            value={category}
            onValueChange={(v) => {
              localStorage.setItem("mappool_category", v);
              setCategory(v);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">MOD</Label>
          <Select value={modFilter} onValueChange={setModFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modFilterOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">审图状态</Label>
          <Select value={paddingFilter} onValueChange={setPaddingFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              <SelectItem value="测图中">审图中</SelectItem>
              <SelectItem value="非测图">非审图</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <HoverCard openDelay={150} closeDelay={0}>
            <HoverCardTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatsOpen(true)}
                className="gap-1.5"
              >
                <BarChart3 className="h-4 w-4" />
                统计
              </Button>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" align="end" className="w-auto p-0">
              {statRows.length > 0 ? (
                <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-3">
                  {statRows.map((r) => (
                    <StageStatCard key={r.category} row={r} />
                  ))}
                </div>
              ) : (
                <p className="p-4 text-xs text-(--pc-faint)">暂无该阶段的统计数据</p>
              )}
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-(--pc-faint)">
        <Badge variant="outline">{selectedIds.size} 已选</Badge>
        <span>
          当前筛选：{season || "全部赛季"} / {category} / {modFilter} / {paddingFilter} · 共{" "}
          {filtered.length} 张{lazyList.length < filtered.length && `（已显示 ${lazyList.length}）`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleSelectAll} disabled={unapprovedFiltered.length === 0}>
            <CheckSquare className="h-4 w-4" />
            {allSelected ? "取消全选" : `一键全选 (${unapprovedFiltered.length})`}
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="teal" size="sm" onClick={() => setBatchOpen(true)}>
              批量过审 ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-(--pc-faint)">
          {data.length === 0 ? "暂无选图" : "没有符合筛选条件的选图"}
        </p>
      ) : view === "table" ? (
        /* ---------- Table view ---------- */
        <div className="mt-4 overflow-x-auto rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-(--pc-border) bg-(--pc-paper)">
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">MOD</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">BID</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">封面</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">歌曲</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">谱师</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">★</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">AR</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">CS</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">OD</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">BPM</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">时长</th>
                <th className="px-3 py-2.5 font-bold text-(--pc-slate)">状态</th>
              </tr>
            </thead>
            <tbody>
              {lazyList.map((m) => (
                <ContextMenu key={m.id}>
                  <ContextMenuTrigger asChild>
                    <tr className="border-b border-(--pc-border)/60 hover:bg-(--pc-paper)">
                      <td className="px-3 py-2.5">
                        <span
                          className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                          style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
                        >
                          {`${modBase(m)}${m.modPosition ?? ""}`}
                        </span>
                        {m.selectedMods?.toUpperCase() === "DT" && m.customDTRate != null && (
                          <span className="block text-xs font-bold text-[#a78bfa]">
                            x{Number(m.customDTRate).toFixed(2)}
                          </span>
                        )}
                        {m.customModName && (
                          <span className="ml-1 text-xs font-bold text-(--pc-slate)">
                            {m.customModName}
                          </span>
                        )}
                      </td>
                      <td
                        onClick={() => copyBid(m)}
                        title="点击复制 BID"
                        className="cursor-pointer px-3 py-2.5 font-mono text-xs text-[#e85d75] transition-colors hover:bg-(--pc-paper)"
                      >
                        {m.beatmapId}
                      </td>
                      <td className="min-w-15 x-3 py-2.5">
                        {m.coverUrl ? (
                          <img
                            src={m.coverUrl}
                            alt=""
                            className="h-10 w-16 rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-10 w-16 rounded-md bg-[#f5c040]/30" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-(--pc-ink)">
                        {[m.artist_unicode || m.artist, m.title_unicode || m.title]
                          .filter(Boolean)
                          .join(" - ")}
                        <span className="text-(--pc-faint)"> [{m.version}]</span>
                      </td>
                      <td className="px-3 py-2.5 text-(--pc-slate)">{m.creator ?? "-"}</td>
                      <td className="px-3 py-2.5 font-sans font-bold" style={{ color: starColor(m.starRating) }}>
                        {fmt(m.starRating)}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmt(m.ar)}</td>
                      <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmt(m.cs)}</td>
                      <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmt(m.od)}</td>
                      <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmt(m.bpm)}</td>
                      <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmtLength(m.totalLength)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {m.approved ? (
                            <Badge variant="teal">已审核</Badge>
                          ) : (
                            <Badge variant="yellow">待审核</Badge>
                          )}
                          {m.padding && <Badge variant="blue">padding</Badge>}
                          {m.isOrigin && <Badge variant="blue">原创</Badge>}
                          {m.isCustome && <Badge variant="yellow">定制</Badge>}
                        </div>
                      </td>
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => setCommentTarget(m)}>
                      <MessageSquare className="h-4 w-4" />
                      评论
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => window.open(`osu://b/${m.beatmapId}`, "_blank")}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M7.698 10.362a1.94 1.94 0 0 0-.7-.516q-.421-.189-.988-.189c-.567 0-.704.063-.982.189s-.51.298-.692.516q-.273.328-.413.777-.139.448-.139.96 0 .511.14.952.139.44.412.767.274.329.692.512t.982.184c.565 0 .707-.062.988-.184q.422-.184.7-.512.279-.327.413-.767.135-.44.135-.952a3.3 3.3 0 0 0-.135-.96 2.1 2.1 0 0 0-.413-.777m-.965 2.81q-.22.372-.723.372-.494 0-.713-.372-.22-.373-.22-1.073c0-.7.073-.824.22-1.073q.22-.372.713-.372.503 0 .723.372.22.373.22 1.073t-.22 1.073m11.89-.83-.09-4.39a4.5 4.5 0 0 1 .69-.054q.351 0 .701.054l-.09 4.39q-.315.053-.601.053a3.5 3.5 0 0 1-.61-.054m1.319 1.4q0 .332-.054.664a4 4 0 0 1-.655.054 4 4 0 0 1-.664-.054 4 4 0 0 1-.054-.655q0-.323.054-.665a4 4 0 0 1 .655-.054q.323 0 .664.054.054.341.054.656m-3.223-4.03q.315 0 .638.053v4.461q-.288.099-.759.193a5.246 5.246 0 0 1-1.863.023 1.7 1.7 0 0 1-.74-.305q-.32-.234-.507-.683-.189-.449-.189-1.193V9.765a4 4 0 0 1 .638-.054q.313 0 .637.054v2.46q0 .367.058.606a.9.9 0 0 0 .18.377.66.66 0 0 0 .3.197q.18.058.422.058.332 0 .557-.062V9.765a4 4 0 0 1 .628-.054m-4.362 2.683q.08.225.08.548a1.4 1.4 0 0 1-.542 1.117q-.265.212-.642.333-.378.12-.853.12a5 5 0 0 1-.395-.013 3 3 0 0 1-.346-.045 4 4 0 0 1-.327-.076 4 4 0 0 1-.35-.116 2.6 2.6 0 0 1 .085-.49 3 3 0 0 1 .175-.48q.296.117.561.175.265.06.552.059.126 0 .274-.023a1 1 0 0 0 .274-.08.65.65 0 0 0 .21-.153.35.35 0 0 0 .086-.247q0-.216-.13-.31a1.3 1.3 0 0 0-.364-.166l-.556-.162q-.503-.143-.786-.426-.282-.283-.283-.848 0-.682.49-1.068.489-.386 1.332-.386.35 0 .692.062.341.063.691.189a2.5 2.5 0 0 1-.09.485 2.3 2.3 0 0 1-.17.44 4 4 0 0 0-.476-.158 2.2 2.2 0 0 0-.548-.067q-.305 0-.476.094a.32.32 0 0 0-.17.301q0 .197.121.278t.346.153l.511.153q.252.072.454.175t.345.255.225.377M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12c6.628 0 12-5.373 12-12S18.628 0 12 0m0 22.8C6.035 22.8 1.2 17.965 1.2 12S6.035 1.2 12 1.2 22.8 6.035 22.8 12 17.965 22.8 12 22.8" />
                      </svg>
                      打开 osu direct
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => window.open(sayobotUrl(m), "_blank", "noopener,noreferrer")}
                    >
                      <Download className="h-4 w-4" />
                      Sayobot 下载
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => window.open(osuMapUrl(m), "_blank", "noopener,noreferrer")}
                    >
                      <Globe className="h-4 w-4" />
                      打开 osu beatmap web
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => void toggleApproved(m)}>
                      {m.approved ? "取消审核" : "通过审核"}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => void togglePadding(m)}>
                      {m.padding ? "取消审图" : "标为审图"}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setAdjustTarget(m)}>调整参数</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => void removeMap(m)} className="text-[#e85d75]">
                      删除
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ---------- Card view (grouped by MOD) ---------- */
        <div className="mt-4 flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.mod}>
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="rounded-xl px-3 py-1 text-sm font-bold text-white shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: MOD_COLORS[g.mod] ?? "#666" }}
                >
                  {MOD_DISPLAY[g.mod] ?? g.mod}
                </span>
                <span className="text-xs text-(--pc-slate)">{g.items.length} 张图</span>
                {(() => {
                  const s = groupStats(g.items);
                  return (
                    <HoverCard openDelay={150} closeDelay={0}>
                      <HoverCardTrigger asChild>
                        <span className="ml-auto flex cursor-help flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--pc-slate)">
                          <span>
                            ★ <b className="font-bold text-[#e85d75]">{fmt(s.avgStar)}</b>
                          </span>
                          <span>长度 {s.avgLen}s</span>
                          <span>BPM {fmt(s.avgBpm)}</span>
                          <span className="text-[#f5c040]">T {s.testing}</span>
                          <span className="text-[#6b7fb5]">P {s.pending}</span>
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent side="bottom" align="end" className="w-auto p-3">
                        <ModStatCard mod={g.mod} items={g.items} />
                      </HoverCardContent>
                    </HoverCard>
                  );
                })()}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {g.items.map((m) => {
                  const comments = commentsByMap[String(m.id)] ?? [];
                  const modColor = MOD_COLORS[modBase(m)] ?? "#666";
                  return (
                    <ContextMenu key={m.id}>
                      <ContextMenuTrigger asChild>
                        <Card
                          key={m.id}
                          className={cn(
                            "group relative overflow-hidden p-0",
                            m.approved && "border-l-8",
                          )}
                          style={m.approved ? { borderLeftColor: "#5cb8a5" } : undefined}
                        >
                          {/* Cover strip */}
                          <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-[#5cb8a5]/40 to-[#6b7fb5]/40">
                            {m.coverUrl && (
                              <img src={m.coverUrl} alt="" className="h-full w-full object-cover" />
                            )}
                            {m.approved && (
                              <span className="absolute right-3 top-2 rounded-lg bg-[#5cb8a5]/90 px-2 py-0.5 text-xs font-bold text-[#fdf6ee]">
                                过审
                              </span>
                            )}
                            {m.padding && (
                              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-[#e0a47e]/90 px-2 py-0.5 text-xs font-bold text-(--pc-ink)">
                                <CircleArrowRight className="h-3.5 w-3.5" />
                                测图中
                              </span>
                            )}
                          </div>

                          <div className="p-4">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                                  style={{ backgroundColor: modColor }}
                                >
                                  {`${modBase(m)}${m.modPosition ?? ""}`}
                                </span>
                                {m.customModName && (
                                  <span className="text-xs font-bold text-(--pc-slate)">
                                    {m.customModName}
                                  </span>
                                )}
                                {m.selectedMods?.toUpperCase() === "DT" && m.customDTRate != null && (
                                  <span className="text-xs font-bold text-[#a78bfa]">
                                    x{Number(m.customDTRate).toFixed(2)}
                                  </span>
                                )}
                                {category === "全部" && m.category && (
                                  <Badge variant="outline">
                                    {CATEGORY_LABEL[m.category] ?? m.category}
                                  </Badge>
                                )}
                                {season === "" && m.season && (
                                  <Badge variant="outline">{seasonLabel(settings, m.season)}</Badge>
                                )}
                                {m.isOrigin && <Badge variant="blue">原创</Badge>}
                                {m.isCustome && <Badge variant="yellow">定制</Badge>}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {!m.approved && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleSelect(m.id)}
                                    title="批量选择"
                                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-[#e85d75]"
                                  >
                                    <Checkbox checked={selectedIds.has(m.id)} className="pointer-events-none" />
                                  </span>
                                )}
                                <HoverCard openDelay={0} closeDelay={0}>
                                  <HoverCardTrigger asChild>
                                    <a
                                      href={sayobotUrl(m)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-[#e85d75]"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                                    <p className="text-xs font-bold text-(--pc-ink)">Sayobot 下载</p>
                                  </HoverCardContent>
                                </HoverCard>
                                <HoverCard openDelay={0} closeDelay={0}>
                                  <HoverCardTrigger asChild>
                                    <a
                                      href={osuMapUrl(m)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-[#e85d75]"
                                    >
                                      <Globe className="h-3.5 w-3.5" />
                                    </a>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                                    <p className="text-xs font-bold text-(--pc-ink)">打开 osu beatmap web 查看</p>
                                  </HoverCardContent>
                                </HoverCard>
                                <HoverCard openDelay={0} closeDelay={0}>
                                  <HoverCardTrigger asChild>
                                    <a
                                      href={`osu://b/${m.beatmapId}`}
                                      className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-[#e85d75]"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      >
                                        <path d="M7.698 10.362a1.94 1.94 0 0 0-.7-.516q-.421-.189-.988-.189c-.567 0-.704.063-.982.189s-.51.298-.692.516q-.273.328-.413.777-.139.448-.139.96 0 .511.14.952.139.44.412.767.274.329.692.512t.982.184c.565 0 .707-.062.988-.184q.422-.184.7-.512.279-.327.413-.767.135-.44.135-.952a3.3 3.3 0 0 0-.135-.96 2.1 2.1 0 0 0-.413-.777m-.965 2.81q-.22.372-.723.372-.494 0-.713-.372-.22-.373-.22-1.073c0-.7.073-.824.22-1.073q.22-.372.713-.372.503 0 .723.372.22.373.22 1.073t-.22 1.073m11.89-.83-.09-4.39a4.5 4.5 0 0 1 .69-.054q.351 0 .701.054l-.09 4.39q-.315.053-.601.053a3.5 3.5 0 0 1-.61-.054m1.319 1.4q0 .332-.054.664a4 4 0 0 1-.655.054 4 4 0 0 1-.664-.054 4 4 0 0 1-.054-.655q0-.323.054-.665a4 4 0 0 1 .655-.054q.323 0 .664.054.054.341.054.656m-3.223-4.03q.315 0 .638.053v4.461q-.288.099-.759.193a5.246 5.246 0 0 1-1.863.023 1.7 1.7 0 0 1-.74-.305q-.32-.234-.507-.683-.189-.449-.189-1.193V9.765a4 4 0 0 1 .638-.054q.313 0 .637.054v2.46q0 .367.058.606a.9.9 0 0 0 .18.377.66.66 0 0 0 .3.197q.18.058.422.058.332 0 .557-.062V9.765a4 4 0 0 1 .628-.054m-4.362 2.683q.08.225.08.548a1.4 1.4 0 0 1-.542 1.117q-.265.212-.642.333-.378.12-.853.12a5 5 0 0 1-.395-.013 3 3 0 0 1-.346-.045 4 4 0 0 1-.327-.076 4 4 0 0 1-.35-.116 2.6 2.6 0 0 1 .085-.49 3 3 0 0 1 .175-.48q.296.117.561.175.265.06.552.059.126 0 .274-.023a1 1 0 0 0 .274-.08.65.65 0 0 0 .21-.153.35.35 0 0 0 .086-.247q0-.216-.13-.31a1.3 1.3 0 0 0-.364-.166l-.556-.162q-.503-.143-.786-.426-.282-.283-.283-.848 0-.682.49-1.068.489-.386 1.332-.386.35 0 .692.062.341.063.691.189a2.5 2.5 0 0 1-.09.485 2.3 2.3 0 0 1-.17.44 4 4 0 0 0-.476-.158 2.2 2.2 0 0 0-.548-.067q-.305 0-.476.094a.32.32 0 0 0-.17.301q0 .197.121.278t.346.153l.511.153q.252.072.454.175t.345.255.225.377M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12c6.628 0 12-5.373 12-12S18.628 0 12 0m0 22.8C6.035 22.8 1.2 17.965 1.2 12S6.035 1.2 12 1.2 22.8 6.035 22.8 12 17.965 22.8 12 22.8" />
                                      </svg>
                                    </a>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                                    <p className="text-xs font-bold text-(--pc-ink)">
                                      osu direct 打开（osu://b/{m.beatmapId}）
                                    </p>
                                  </HoverCardContent>
                                </HoverCard>
                                <HoverCard openDelay={0} closeDelay={0}>
                                  <HoverCardTrigger asChild>
                                    <button
                                      onClick={() => copyBid(m)}
                                      className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-[#e85d75]"
                                    >
                                      <Clipboard className="h-3.5 w-3.5" />
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                                    <p className="text-xs font-bold text-(--pc-ink)">
                                      BID: <span className="font-mono text-[#e85d75]">{m.beatmapId}</span>
                                    </p>
                                  </HoverCardContent>
                                </HoverCard>
                              </div>
                            </div>

                            {/* Title */}
                            <p className="mt-2 line-clamp-2 font-bold text-(--pc-ink)">
                              {[m.artist_unicode || m.artist, m.title_unicode || m.title]
                                .filter(Boolean)
                                .join(" - ") || "未知曲目"}
                            </p>
                            <p className="text-xs text-(--pc-faint)">
                              [{m.version}] by {m.creator ?? "-"}
                            </p>

                            {/* Stats */}
                            <div className="mt-3 grid grid-cols-4 gap-1.5">
                              {statCell("CS", fmt(m.cs))}
                              {statCell("AR", fmt(m.ar))}
                              {statCell("OD", fmt(m.od))}
                              {statCell("HP", fmt(m.hp))}
                              {statCell("时长", fmtLength(m.totalLength))}
                              {statCell("MaxCombo", m.maxCombo != null ? String(m.maxCombo) : "-")}
                              {statCell("BPM", fmt(m.bpm))}
                              {statCell("★", fmt(m.starRating), starColor(m.starRating))}
                            </div>

                            {/* Nominator */}
                            <div className="mt-3 flex items-center gap-2">
                              {m.selectedByAvatar ? (
                                <img
                                  src={m.selectedByAvatar}
                                  alt=""
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="grid h-6 w-6 place-items-center rounded-full bg-[#f5c040]/30 text-[10px] font-bold text-(--pc-ink)">
                                  {(m.selectedByUsername || m.selectedBy || "?").slice(0, 1)}
                                </div>
                              )}
                              <span className="text-xs text-(--pc-slate)">
                                {m.selectedByUsername || m.selectedBy || "未知提名者"}
                              </span>
                              <HoverCard openDelay={0} closeDelay={0}>
                                <HoverCardTrigger asChild>
                                  <button
                                    onClick={() => setCommentTarget(m)}
                                    className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-[#e85d75]"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                                  <p className="text-xs font-bold text-(--pc-ink)">添加评论</p>
                                </HoverCardContent>
                              </HoverCard>
                            </div>

                            {/* Note */}
                            {m.comment && (
                              <p className="mt-2 rounded-lg bg-(--pc-paper) px-2 py-1 text-xs text-(--pc-faint)">
                                备注：{m.comment}
                              </p>
                            )}

                            {/* Comments preview */}
                            {comments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {comments.slice(0, 3).map((c) => (
                                  <HoverCard key={c.id}>
                                    <HoverCardTrigger asChild>
                                      <button
                                        onClick={() => setCommentTarget(m)}
                                        className="flex items-center gap-1.5 rounded-full border-2 border-(--pc-border) bg-(--pc-white) px-2 py-1 text-left transition hover:-translate-y-0.5"
                                      >
                                        <Avatar className="h-5 w-5">
                                          {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.username} />}
                                          <AvatarFallback className="bg-[#f5c040]/30 text-[8px] font-bold text-(--pc-ink)">
                                            {c.username?.slice(0, 1).toUpperCase() || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-(--pc-slate)">
                                          {c.comment.slice(0, 12)}
                                          {c.comment.length > 12 ? "…" : ""}
                                        </span>
                                      </button>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72">
                                      <div className="flex items-center gap-2.5">
                                        <Avatar className="h-10 w-10 rounded-xl">
                                          {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.username} />}
                                          <AvatarFallback className="bg-[#f5c040]/30 font-bold text-(--pc-ink)">
                                            {c.username?.slice(0, 1).toUpperCase() || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                          <p className="font-bold text-sm text-(--pc-ink)">{c.username}</p>
                                          <p className="text-xs text-(--pc-faint)">
                                            osuID: {c.userId}
                                            {c.createdAt ? ` · ${formatDateTime(c.createdAt)}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <p className="mt-3 text-sm leading-relaxed text-(--pc-slate)">
                                        {c.comment}
                                      </p>
                                    </HoverCardContent>
                                  </HoverCard>
                                ))}
                                {comments.length > 3 && (
                                  <button
                                    onClick={() => setCommentTarget(m)}
                                    className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-[10px] font-bold text-[#e85d75]"
                                  >
                                    +{comments.length - 3}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </Card>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onSelect={() => void toggleApproved(m)}>
                          {m.approved ? "取消审核" : "通过审核"}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => void togglePadding(m)}>
                          {m.padding ? "取消审图" : "标为审图"}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => setAdjustTarget(m)}>
                          调整参数
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onSelect={() => void removeMap(m)} className="text-[#e85d75]">
                          删除
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {lazyList.length < filtered.length && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => setVisible((v) => v + 60)}>
            加载更多（{lazyList.length} / {filtered.length}）
          </Button>
        </div>
      )}

      <BatchApproveDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        maps={selectedMaps}
        onConfirm={() => void confirmBulkApprove()}
        busy={busy === "bulk"}
      />

      <CommentDialog
        open={!!commentTarget}
        onOpenChange={(o) => !o && setCommentTarget(null)}
        map={commentTarget}
      />

      <AdjustStatsDialog
        open={!!adjustTarget}
        onOpenChange={(o) => !o && setAdjustTarget(null)}
        map={adjustTarget}
        onSaved={load}
      />

      {/* 阶段统计弹窗（点击统计按钮打开） */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {category === "全部" ? "全部阶段" : CATEGORY_LABEL[category] ?? category} 统计
            </DialogTitle>
            <DialogDescription>
              {season ? `赛季 ${seasonLabel(settings, season)}` : "全部赛季"} 图池统计数据
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
            {statRows.length > 0 ? (
              statRows.map((r) => <StageStatCard key={r.category} row={r} />)
            ) : (
              <p className="py-4 text-center text-xs text-(--pc-faint)">暂无该阶段的统计数据</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
