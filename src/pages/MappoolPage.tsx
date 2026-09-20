import { useEffect, useRef, useState } from "react";
import { Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PageHeader } from "@/components/paper/paper";
import { LoadingBlock, ErrorBlock, useAsync } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn, fmt } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { MODS_ORDER, CATEGORY_OPTIONS, CATEGORY_LABEL, seasonOptions as buildSeasonOptions, type MapSelection } from "@/lib/types";
import { BulkDownload, downloadSingleMap } from "@/components/mappool/MapPoolTools";

type ViewMode = "card" | "table";

/** 设置的当前阶段(短码) → 图池类别(长值) */
const STAGE_TO_CATEGORY: Record<string, string> = {
  qua: "qualification",
  ro16: "ro16",
  qf: "quarterfinals",
  sf: "semifinals",
  f: "finals",
  gf: "grandfinals",
};

interface ModGroup {
  mod: string;
  items: MapSelection[];
}

function displayTitle(m: MapSelection, useUnicode: boolean): string {
  const artist = useUnicode ? m.artist_unicode || m.artist : m.artist;
  const title = useUnicode ? m.title_unicode || m.title : m.title;
  return [artist, m.version].filter(Boolean).join(" - ") || title || "未知曲目";
}

function fmtLength(seconds: number | null): string {
  if (seconds == null) return "-";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** First mod segment (e.g. "HD+HR" -> "HD"), defaulting to "NM". */
function modKey(m: MapSelection): string {
  if (!m.selectedMods) return "NM";
  return m.selectedMods.split("+")[0].toUpperCase() || "NM";
}

function groupMaps(list: MapSelection[]): ModGroup[] {
  const map = new Map<string, MapSelection[]>();
  for (const m of list) {
    const key = modKey(m);
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

function osuLink(m: MapSelection): string {
  return m.url ?? `https://osu.ppy.sh/beatmaps/${m.beatmapId}`;
}

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

function ModHeader({ group }: { group: ModGroup }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span
        className="rounded-xl px-3 py-1 text-sm font-bold text-white shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
        style={{ backgroundColor: MOD_COLORS[group.mod] ?? "#666" }}
      >
        {MOD_DISPLAY[group.mod] ?? group.mod}
      </span>
      <span className="text-xs text-(--pc-slate)">{group.items.length} 张图</span>
    </div>
  );
}

function statCell(label: string, value: string) {
  return (
    <div className="rounded-xl bg-(--pc-paper) px-2 py-1.5 text-center">
      <p className="text-[10px] text-(--pc-faint)">{label}</p>
      <p className="font-sans text-sm font-bold text-(--pc-ink)">{value}</p>
    </div>
  );
}

function MapCard({ map, useUnicode }: { map: MapSelection; useUnicode: boolean }) {
  const title = (() => {
    const artist = useUnicode ? map.artist_unicode || map.artist : map.artist;
    const t = useUnicode ? map.title_unicode || map.title : map.title;
    return [artist, t].filter(Boolean).join(" - ") || "未知曲目";
  })();
  const handleDownload = () => {
    void downloadSingleMap(map).then((ok) =>
      ok
        ? toast({ title: "开始下载", description: map.title })
        : toast({ variant: "destructive", title: "该图不支持下载" }),
    );
  };
  return (
    <a
      href={osuLink(map)}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]"
    >
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-[#5cb8a5]/40 to-[#6b7fb5]/40">
        {map.coverUrl ? (
          <img
            src={map.coverUrl}
            alt={map.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[#f5c040]/30 px-4">
            <span className="line-clamp-2 text-center text-sm font-bold text-(--pc-ink)">
              {map.title || "未命名图"}
            </span>
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void navigator.clipboard
              .writeText(String(map.beatmapId))
              .then(() => toast({ title: "已复制 BID", description: String(map.beatmapId) }))
              .catch(() => toast({ variant: "destructive", title: "复制失败" }));
          }}
          title="复制 BID"
          className="absolute right-11 top-2 grid h-8 w-8 place-items-center rounded-lg bg-(--pc-white)/90 text-[#6b7fb5] shadow-[2px_2px_0px_rgba(0,0,0,0.1)] opacity-0 transition hover:text-[#e85d75] group-hover:opacity-100"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDownload();
          }}
          title="下载谱面"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-(--pc-white)/90 text-[#6b7fb5] shadow-[2px_2px_0px_rgba(0,0,0,0.1)] opacity-0 transition hover:text-[#e85d75] group-hover:opacity-100"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: MOD_COLORS[modKey(map)] ?? "#666" }}
          >
            {map.selectedMods ?? "NM"}
            {map.modPosition ?? ""}
          </span>
          {map.isOrigin && <Badge variant="blue">原创</Badge>}
          {map.isCustome && <Badge variant="yellow">定制</Badge>}
          {map.category && (
            <Badge variant="outline">{CATEGORY_LABEL[map.category] ?? map.category}</Badge>
          )}
        </div>
        <p className="mt-2 line-clamp-2 font-bold text-(--pc-ink)">{title}</p>
        <p className="text-xs text-(--pc-faint)">
          [{map.version}] by {map.creator ?? "-"}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {statCell("CS", fmt(map.cs))}
          {statCell("AR", fmt(map.ar))}
          {statCell("OD", fmt(map.od))}
          {statCell("HP", fmt(map.hp))}
          {statCell("时长", fmtLength(map.totalLength))}
          {statCell("MaxCombo", map.maxCombo != null ? String(map.maxCombo) : "-")}
          {statCell("BPM", fmt(map.bpm))}
          {statCell("★", fmt(map.starRating))}
        </div>
      </div>
    </a>
  );
}

function MapTable({ group, useUnicode }: { group: ModGroup; useUnicode: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-(--pc-border) bg-(--pc-paper)">
            <th className="px-4 py-3 font-bold text-(--pc-slate)">MOD</th>
            <th className="min-w-25 min-h-9 px-4 py-3 font-bold text-(--pc-slate)">封面</th>
            <th className="w-full px-4 py-3 font-bold text-(--pc-slate)">图名</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">AR</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">CS</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">OD</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">BPM</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">时长</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">Max</th>
            {group.items.some((m) => m.moddedStats?.totalHitObjects != null) && (
              <th className="px-4 py-3 font-bold text-(--pc-slate)">物件数</th>
            )}
            <th className="px-4 py-3 font-bold text-(--pc-slate)">星级</th>
          </tr>
        </thead>
        <tbody>
          {group.items.map((m) => {
            const title = displayTitle(m, useUnicode);
            const objs = m.moddedStats?.totalHitObjects;
            return (
              <tr
                key={m.id}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("a")) return;
                  void navigator.clipboard
                    .writeText(String(m.beatmapId))
                    .then(() => toast({ title: "已复制 BID", description: String(m.beatmapId) }))
                    .catch(() => toast({ variant: "destructive", title: "复制失败" }));
                }}
                title="点击复制 BID"
                className="cursor-pointer border-b border-(--pc-border)/60 transition-colors hover:bg-(--pc-paper)"
              >
                <td className="px-4 py-3">
                  <span
                    className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: MOD_COLORS[modKey(m)] ?? "#666" }}
                  >
                    {m.selectedMods ?? "NM"}
                    {m.modPosition ?? ""}
                  </span>
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">
                  {m.isOrigin && <Badge variant="blue" className="mr-1">原创</Badge>}
                  {m.isCustome && <Badge variant="yellow" className="mr-1">定制</Badge>}
                  <a
                    href={osuLink(m)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-(--pc-ink) transition-colors hover:text-[#e85d75]"
                  >
                    {title}
                  </a>
                  {m.version && (
                    <span className="ml-1 text-xs text-(--pc-faint)">[{m.version}]</span>
                  )}
                </td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmt(m.ar)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmt(m.cs)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmt(m.od)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmt(m.bpm)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmtLength(m.totalLength)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">
                  {m.maxCombo != null ? m.maxCombo : "-"}
                </td>
                {objs != null && (
                  <td className="px-4 py-3 font-sans text-(--pc-slate)">{objs}</td>
                )}
                <td className="px-4 py-3 font-sans text-[#e85d75]">{fmt(m.starRating)}★</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MappoolPage() {
  const { settings } = useApp();
  const seasonChosenRef = useRef(!!localStorage.getItem("mappool_season"));
  const categoryChosenRef = useRef(!!localStorage.getItem("mappool_category"));

  const [category, setCategory] = useState<string>(
    () => localStorage.getItem("mappool_category") ?? "全部",
  );
  const [view, setView] = useState<ViewMode>(() => {
    const v = localStorage.getItem("mappool_view");
    return v === "table" ? "table" : "card";
  });
  const [useUnicode, setUseUnicode] = useState<boolean>(
    () => localStorage.getItem("mappool_unicode") === "1",
  );

  const toggleUnicode = () => {
    setUseUnicode((v) => {
      const next = !v;
      localStorage.setItem("mappool_unicode", next ? "1" : "0");
      return next;
    });
  };
  const [season, setSeason] = useState<string>(() => {
    const saved = localStorage.getItem("mappool_season");
    if (saved) {
      seasonChosenRef.current = true;
      return saved;
    }
    return settings?.current_season || "s1";
  });

  const seasonSelectOptions = (() => {
    const pool = buildSeasonOptions(settings);
    return pool.length
      ? pool
      : [{ value: settings?.current_season || "s1", label: settings?.current_season || "S1" }];
  })();

  // Sync season to the tournament setting until the user picks one.
  useEffect(() => {
    if (seasonChosenRef.current) return;
    const cur = settings?.current_season;
    if (cur && cur !== season) setSeason(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.current_season]);

  // 轮次默认取设置中的当前阶段（短码 → 类别长值），直到用户手动选择
  useEffect(() => {
    if (categoryChosenRef.current) return;
    const stage = settings?.current_season_stage;
    const mapped = stage ? STAGE_TO_CATEGORY[stage] : undefined;
    if (mapped && mapped !== category) setCategory(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.current_season_stage]);

  // Reflect category in the URL.
  useEffect(() => {
    const suffix = category === "全部" ? "" : `?category=${encodeURIComponent(category)}`;
    window.history.replaceState(null, "", `/mappool${suffix}`);
  }, [category]);

  // 赛季/轮次同步完成前不拉取图池：等两个 Select 稳定到最终值再加载
  const settingsReady = !!settings?.seasons || !!settings?.current_season;
  const seasonSettled =
    seasonChosenRef.current || !settings?.current_season || season === settings?.current_season;
  const stageMapped = settings?.current_season_stage
    ? STAGE_TO_CATEGORY[settings.current_season_stage]
    : undefined;
  const categorySettled =
    categoryChosenRef.current || !settings?.current_season_stage || !stageMapped || category === stageMapped;
  const { data, loading, error, run } = useAsync<MapSelection[]>();

  const poolUrl = (s: string, c: string) =>
    "/api/map-selections" +
    (s
      ? `?season=${encodeURIComponent(s)}&approved=true${
          c === "全部" ? "" : `&category=${encodeURIComponent(c)}`
        }`
      : "");

  useEffect(() => {
    if (!settingsReady || !season || !seasonSettled || !categorySettled) return;
    void run(() => api.get<MapSelection[]>(poolUrl(season, category)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsReady, season, category, seasonSettled, categorySettled]);

  if (String(settings?.mappool_visible ?? "true") === "false") {
    return (
      <div className="bg-(--pc-paper)">
        <PageHeader title="图池" subtitle="本赛事的比赛选图池" />
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="rounded-2xl bg-(--pc-white) p-10 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-(--pc-faint)">图池尚未公开，敬请期待</p>
          </div>
        </div>
      </div>
    );
  }

  const groups = groupMaps(data ?? []);

  return (
    <div className="bg-(--pc-paper)">
      <PageHeader title="图池" subtitle="查看各轮次选图与竞赛信息" />

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-(--pc-faint)">赛季</span>
              <Select
                value={season}
                onValueChange={(v) => {
                  seasonChosenRef.current = true;
                  setSeason(v);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择赛季" />
                </SelectTrigger>
                <SelectContent>
                  {seasonSelectOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-(--pc-faint)">轮次</span>
              <Select
                value={category}
                onValueChange={(v) => {
                  categoryChosenRef.current = true;
                  setCategory(v);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择轮次" />
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-(--pc-white) border-2 border-(--pc-border) p-1 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
              {(["card", "table"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setView(v);
                    localStorage.setItem("mappool_view", v);
                  }}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-bold transition-colors",
                    view === v
                      ? "bg-[#6b7fb5] text-[#fdf6ee]"
                      : "bg-transparent text-(--pc-slate) hover:text-(--pc-ink)",
                  )}
                >
                  {v === "card" ? "卡片" : "表格"}
                </button>
              ))}
            </div>
            <button
              onClick={toggleUnicode}
              className={cn(
                "rounded-xl border-2 px-4 py-2 text-sm font-bold transition-all duration-200",
                useUnicode
                  ? "border-[#f5c040] bg-[#f5c040] text-(--pc-ink) shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
                  : "border-(--pc-border) bg-(--pc-white) text-(--pc-slate) hover:text-(--pc-ink)",
              )}
            >
              原曲名
            </button>
            <BulkDownload maps={data ?? []} />
          </div>
        </div>

        {(!settingsReady || loading) && <LoadingBlock label="正在加载图池…" />}
        {settingsReady && error && (
          <ErrorBlock
            message={error}
            onRetry={() => void run(() => api.get<MapSelection[]>(poolUrl(season, category)))}
          />
        )}

        {settingsReady && !loading && !error && groups.length === 0 && (
          <div className="rounded-2xl bg-(--pc-white) p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-(--pc-faint)">该轮次暂未公开选图</p>
          </div>
        )}

        {settingsReady && !loading && !error && groups.length > 0 && (
          <div className="flex flex-col gap-10">
            {groups.map((g) => (
              <section key={g.mod}>
                <ModHeader group={g} />
                {view === "card" ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {g.items.map((m) => (
                      <MapCard key={m.id} map={m} useUnicode={useUnicode} />
                    ))}
                  </div>
                ) : (
                  <MapTable group={g} useUnicode={useUnicode} />
                )}
              </section>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}