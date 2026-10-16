import { useEffect, useState } from "react";
import { Clipboard, Download, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PageHeader } from "@/components/paper/paper";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { LoadingBlock, ErrorBlock, useAsync } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn, fmt, osuAvatarUrl } from "@/lib/utils";
import { getDifficultyColor } from "@/lib/difficultyColor";
import { useApp } from "@/lib/app-context";
import { MODS_ORDER, CATEGORY_OPTIONS, CATEGORY_LABEL, seasonOptions as buildSeasonOptions, type MapSelection } from "@/lib/types";
import { MOD_COLORS, MOD_DISPLAY, modBase } from "@/lib/mods";
import { site } from "@/lib/site";
import { BulkDownload, OppPoolButton } from "@/components/mappool/MapPoolTools";

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

function groupMaps(list: MapSelection[]): ModGroup[] {
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

function osuLink(m: MapSelection): string {
  return m.url ?? site.urls.osuBeatmap(m.beatmapId);
}

function sayobotUrl(s: MapSelection): string {
  return site.urls.sayobot(s.beatmapsetId ?? s.beatmapId);
}

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

function statCell(label: string, value: string, color?: string) {
  return (
    <div className="rounded-xl bg-(--pc-paper) px-2 py-1.5 text-center">
      <p className="text-[10px] text-(--pc-faint)">{label}</p>
      <p className="font-sans text-sm font-bold" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function MapCard({ map, useUnicode }: { map: MapSelection; useUnicode: boolean }) {
  const title = (() => {
    const artist = useUnicode ? map.artist_unicode || map.artist : map.artist;
    const t = useUnicode ? map.title_unicode || map.title : map.title;
    return [artist, t].filter(Boolean).join(" - ") || "未知曲目";
  })();
  const copyBid = () => {
    void navigator.clipboard
      .writeText(String(map.beatmapId))
      .then(() => toast({ title: "已复制 BID", description: String(map.beatmapId) }))
      .catch(() => toast({ variant: "destructive", title: "复制失败" }));
  };
  return (
    <div className="group overflow-hidden rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]">
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-pc-teal/40 to-pc-blue/40">
        {map.coverUrl ? (
          <img
            src={map.coverUrl}
            alt={map.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-pc-yellow/30 px-4">
            <span className="line-clamp-2 text-center text-sm font-bold text-(--pc-ink)">
              {map.title || "未命名图"}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: MOD_COLORS[modBase(map)] ?? "#666" }}
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
          <div className="flex items-center gap-1.5">
            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger asChild>
                <a
                  href={sayobotUrl(map)}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
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
                  href={osuLink(map)}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
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
                  href={`osu://b/${map.beatmapId}`}
                  className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
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
                  osu direct 打开（osu://b/{map.beatmapId}）
                </p>
              </HoverCardContent>
            </HoverCard>
            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger asChild>
                <button
                  onClick={copyBid}
                  className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                <p className="text-xs font-bold text-(--pc-ink)">
                  BID: <span className="font-mono text-pc-primary">{map.beatmapId}</span>
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
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
          {statCell("★", fmt(map.starRating), getDifficultyColor(map.starRating ?? 0))}
        </div>
        {(map.selectedByUsername || map.selectedBy) && (
          <div className="mt-3 flex items-center gap-2">
            {map.selectedByAvatar || osuAvatarUrl(map.selectedBy) ? (
              <img
                src={map.selectedByAvatar || osuAvatarUrl(map.selectedBy)}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-6 w-6 place-items-center rounded-full bg-pc-yellow/30 text-[10px] font-bold text-(--pc-ink)">
                {(map.selectedByUsername || map.selectedBy || "?").slice(0, 1)}
              </div>
            )}
            <span className="text-xs text-(--pc-slate)">
              {map.selectedByUsername || map.selectedBy || "未知"}
            </span>
          </div>
        )}
        {map.comment && (
          <p className="mt-2 rounded-lg bg-(--pc-paper) px-2 py-1 text-xs text-(--pc-faint)">
            备注：{map.comment}
          </p>
        )}
      </div>
    </div>
  );
}

function MapTable({ group, useUnicode }: { group: ModGroup; useUnicode: boolean }) {
  // 列是否展示“物件数”由整组决定，保证 th 与 td 数量一致
  const showObjs = group.items.some((m) => m.moddedStats?.totalHitObjects != null);
  return (
    <div className="overflow-x-auto rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b-2 border-(--pc-border) bg-(--pc-paper)">
            <th className="px-4 py-3 font-bold text-(--pc-slate)">MOD</th>
            <th className="min-w-25 min-h-9 px-4 py-3 font-bold text-(--pc-slate)">封面</th>
            <th className="w-full px-4 py-3 font-bold text-(--pc-slate)">图名</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">CS</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">AR</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">OD</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">BPM</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">时长</th>
            <th className="px-4 py-3 font-bold text-(--pc-slate)">Max</th>
            {showObjs && (
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
                    style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
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
                    <div className="h-10 w-16 rounded-md bg-pc-yellow/30" />
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.isOrigin && <Badge variant="blue" className="mr-1">原创</Badge>}
                  {m.isCustome && <Badge variant="yellow" className="mr-1">定制</Badge>}
                  <a
                    href={osuLink(m)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-(--pc-ink) transition-colors hover:text-pc-primary"
                  >
                    {title}
                  </a>
                  {m.version && (
                    <span className="ml-1 text-xs text-(--pc-faint)">[{m.version}]</span>
                  )}
                </td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmt(m.cs)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmt(m.ar)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmt(m.od)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmt(m.bpm)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">{fmtLength(m.totalLength)}</td>
                <td className="px-4 py-3 font-sans text-(--pc-slate)">
                  {m.maxCombo != null ? m.maxCombo : "-"}
                </td>
                {showObjs && (
                  <td className="px-4 py-3 font-sans text-(--pc-slate)">{objs ?? "-"}</td>
                )}
                <td
                  className="px-4 py-3 font-sans font-bold"
                  style={{ color: getDifficultyColor(m.starRating ?? 0) }}
                >
                  {fmt(m.starRating)}★
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MappoolPage() {
  const { settings, settingsLoaded } = useApp();
  // 首次载入(init=false)允许自动同步到最新赛季/当前阶段并持久化；之后(init=true)保持用户选择
  const [init] = useState(() => localStorage.getItem("mappool_init") === "true");
  // 首次挂载后落盘（不在 useState 初始化器里写副作用，否则 StrictMode 双调用会让 init 误为 true）
  useEffect(() => {
    try {
      localStorage.setItem("mappool_init", "true");
    } catch {
      /* ignore */
    }
  }, []);

  const [category, setCategory] = useState<string>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("category");
    return fromUrl ?? localStorage.getItem("mappool_category") ?? "全部";
  });
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
    if (saved) return saved;
    return settings?.current_season || "";
  });

  const seasonSelectOptions = (() => {
    const pool = buildSeasonOptions(settings);
    if (pool.length) return pool;
    return season ? [{ value: season, label: season.toUpperCase() }] : [];
  })();

  // 仅在第一次载入时同步赛季到设置中的当前赛季，并持久化；之后保持用户选择
  useEffect(() => {
    if (init) return;
    const cur = settings?.current_season;
    if (cur && cur !== season) {
      localStorage.setItem("mappool_season", cur);
      setSeason(cur);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.current_season, season]);

  // 仅在第一次载入时同步轮次到设置中的当前阶段（短码 → 类别长值），并持久化；之后保持用户选择
  useEffect(() => {
    if (init) return;
    const stage = settings?.current_season_stage;
    const mapped = stage ? STAGE_TO_CATEGORY[stage] : undefined;
    if (mapped && mapped !== category) {
      localStorage.setItem("mappool_category", mapped);
      setCategory(mapped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.current_season_stage, category]);

  // Reflect category in the URL（保留 path/hash 与其他 query 参数，便于分享深链）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (category === "全部") params.delete("category");
    else params.set("category", category);
    const suffix = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${suffix ? `?${suffix}` : ""}${window.location.hash}`,
    );
  }, [category]);

  // settings 请求结束后即可按当前赛季/轮次拉取图池：
  // 即使 /api/settings 失败，也用 localStorage/默认赛季继续，避免永久停留在 loading。
  const settingsReady = settingsLoaded;
  const seasonSettled =
    init || !settings?.current_season || season === settings?.current_season;
  const stageMapped = settings?.current_season_stage
    ? STAGE_TO_CATEGORY[settings.current_season_stage]
    : undefined;
  const categorySettled =
    init || !settings?.current_season_stage || !stageMapped || category === stageMapped;
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
                  localStorage.setItem("mappool_season", v);
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
                  localStorage.setItem("mappool_category", v);
                  setCategory(v);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择轮次" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部">All</SelectItem>
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
                      ? "bg-pc-blue text-pc-cream"
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
                  ? "border-pc-yellow bg-pc-yellow text-(--pc-ink) shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
                  : "border-(--pc-border) bg-(--pc-white) text-(--pc-slate) hover:text-(--pc-ink)",
              )}
            >
              原曲名
            </button>
            <BulkDownload maps={loading ? [] : (data ?? [])} />
            <OppPoolButton season={season} category={category} />
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