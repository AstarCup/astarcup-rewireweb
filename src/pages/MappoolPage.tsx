import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PageHeader, SectionTitle } from "@/components/paper/paper";
import { LoadingBlock, ErrorBlock, useFetch } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn, fmt } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { MODS_ORDER, seasonOptions as buildSeasonOptions, type MapSelection } from "@/lib/types";
import { BulkDownload, MapHoverCard, downloadSingleMap } from "@/components/mappool/MapPoolTools";

const CATEGORY_OPTIONS = ["全部", "资格赛", "32强", "16强", "8强", "半决赛", "决赛", "总决赛"];

type ViewMode = "card" | "table";

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
  return keys.map((mod) => ({ mod, items: map.get(mod)! }));
}

function slotLabel(m: MapSelection): string {
  return m.modPosition ?? m.selectedMods ?? "NM";
}

function osuLink(m: MapSelection): string {
  return m.url ?? `https://osu.ppy.sh/beatmaps/${m.beatmapId}`;
}

function ModHeader({ group }: { group: ModGroup }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="inline-block rounded-xl bg-[#e85d75] px-3 py-1 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)]">
        {group.mod}
      </span>
      <span className="text-xs text-[#666666]">{group.items.length} 张图</span>
    </div>
  );
}

function MapCard({ map, useUnicode }: { map: MapSelection; useUnicode: boolean }) {
  const title = displayTitle(map, useUnicode);
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
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]"
    >
      <div className="relative">
        {map.coverUrl ? (
          <img
            src={map.coverUrl}
            alt={map.title}
            className="h-28 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-28 w-full items-center justify-center bg-[#f5c040]/30 px-4">
            <span className="line-clamp-2 text-center text-sm font-bold text-[#2d2d2d]">
              {map.title || "未命名图"}
            </span>
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDownload();
          }}
          title="下载谱面"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-[#6b7fb5] shadow-[2px_2px_0px_rgba(0,0,0,0.1)] opacity-0 transition hover:text-[#e85d75] group-hover:opacity-100"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="shrink-0 border-[#6b7fb5]/40 text-[#6b7fb5]">
            {slotLabel(map)}
          </Badge>
          <Badge className="border-[#5cb8a5] bg-[#5cb8a5] text-[#fdf6ee]">
            {map.selectedMods ?? "NM"}
          </Badge>
        </div>
        <p className="line-clamp-2 font-bold text-sm text-[#2d2d2d]">{title}</p>
        <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-[#666666]">
          <span className="rounded-lg bg-[#e85d75]/10 px-2 py-0.5 font-bold text-[#e85d75]">
            {fmt(map.starRating)}★
          </span>
          <span className="rounded-lg bg-[#6b7fb5]/10 px-2 py-0.5 font-bold text-[#6b7fb5]">
            {map.bpm ?? "-"} BPM
          </span>
          <span className="rounded-lg bg-[#f5c040]/15 px-2 py-0.5 font-bold text-[#2d2d2d]">
            {fmtLength(map.totalLength)}
          </span>
        </div>
      </div>
    </a>
  );
}

function MapTable({ group, useUnicode }: { group: ModGroup; useUnicode: boolean }) {
  const [hover, setHover] = useState<{ map: MapSelection; rect: DOMRect } | null>(null);
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-[#e0d8cc] bg-[#fdf6ee]">
            <th className="px-4 py-3 font-bold text-[#666666]">位</th>
            <th className="px-4 py-3 font-bold text-[#666666]">MOD</th>
            <th className="px-4 py-3 font-bold text-[#666666]">图名</th>
            <th className="px-4 py-3 font-bold text-[#666666]">星级</th>
            <th className="px-4 py-3 font-bold text-[#666666]">BPM</th>
            <th className="px-4 py-3 font-bold text-[#666666]">时长</th>
            {group.items.some((m) => m.moddedStats?.totalHitObjects != null) && (
              <th className="px-4 py-3 font-bold text-[#666666]">物件数</th>
            )}
          </tr>
        </thead>
        <tbody>
          {group.items.map((m) => {
            const title = displayTitle(m, useUnicode);
            const objs = m.moddedStats?.totalHitObjects;
            return (
              <tr
                key={m.id}
                onMouseEnter={(e) => setHover({ map: m, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setHover(null)}
                className="border-b border-[#e0d8cc]/60 transition-colors hover:bg-[#fdf6ee]"
              >
                <td className="px-4 py-3 font-sans text-xs font-bold text-[#b0a898]">
                  {slotLabel(m)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="teal" className="border-[#5cb8a5] bg-[#5cb8a5] text-[#fdf6ee]">
                    {m.selectedMods ?? "NM"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={osuLink(m)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#2d2d2d] transition-colors hover:text-[#e85d75]"
                  >
                    {title}
                  </a>
                </td>
                <td className="px-4 py-3 font-sans text-[#e85d75]">{fmt(m.starRating)}★</td>
                <td className="px-4 py-3 font-sans text-[#666666]">{m.bpm ?? "-"}</td>
                <td className="px-4 py-3 font-sans text-[#666666]">{fmtLength(m.totalLength)}</td>
                {objs != null && (
                  <td className="px-4 py-3 font-sans text-[#666666]">{objs}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {hover && (
        <MapHoverCard
          map={hover.map}
          rect={{ left: hover.rect.left, top: hover.rect.top, bottom: hover.rect.bottom }}
        />
      )}
    </div>
  );
}

export default function MappoolPage() {
  const { settings } = useApp();
  const seasonChosenRef = useRef(!!localStorage.getItem("mappool_season"));

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

  // Reflect category in the URL.
  useEffect(() => {
    const suffix = category === "全部" ? "" : `?category=${encodeURIComponent(category)}`;
    window.history.replaceState(null, "", `/mappool${suffix}`);
  }, [category]);

  // Build the query from the current season/category.
  const { data, loading, error, load } = useFetch<MapSelection[]>(() =>
    api.get<MapSelection[]>(
      "/api/map-selections" +
        (season
          ? `?season=${encodeURIComponent(season)}&approved=true${
              category === "全部" ? "" : `&category=${encodeURIComponent(category)}`
            }`
          : ""),
    ),
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, category]);

  if (String(settings?.mappool_visible ?? "true") === "false") {
    return (
      <div className="bg-[#fdf6ee]">
        <PageHeader title="图池" subtitle="本赛事的比赛选图池" />
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="rounded-2xl bg-white p-10 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-[#b0a898]">图池尚未公开，敬请期待</p>
          </div>
        </div>
      </div>
    );
  }

  const groups = groupMaps(data ?? []);

  return (
    <div className="bg-[#fdf6ee]">
      <PageHeader title="图池" subtitle="查看各轮次选图与竞赛信息" />

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[#b0a898]">赛季</span>
              <Select value={season} onValueChange={(v) => setSeason(v)}>
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
              <span className="text-xs font-bold text-[#b0a898]">轮次</span>
              <Select value={category} onValueChange={(v) => setCategory(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择轮次" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-white border-2 border-[#e0d8cc] p-1 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
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
                      : "bg-transparent text-[#666666] hover:text-[#2d2d2d]",
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
                  ? "border-[#f5c040] bg-[#f5c040] text-[#2d2d2d] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
                  : "border-[#e0d8cc] bg-white text-[#666666] hover:text-[#2d2d2d]",
              )}
            >
              原曲名
            </button>
            <BulkDownload maps={data ?? []} />
          </div>
        </div>

        {loading && <LoadingBlock label="正在加载图池…" />}
        {error && <ErrorBlock message={error} onRetry={() => void load()} />}

        {!loading && !error && groups.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-[#b0a898]">该轮次暂未公开选图</p>
          </div>
        )}

        {!loading && !error && groups.length > 0 && (
          <div className="flex flex-col gap-10">
            {groups.map((g) => (
              <section key={g.mod}>
                <ModHeader group={g} />
                {view === "card" ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mt-12 border-t-2 border-[#e0d8cc] pt-6">
          <SectionTitle tag="提示" accent="#5cb8a5">
            图池说明
          </SectionTitle>
          <p className="max-w-2xl text-sm text-[#666666]">
            点击任意选图即可跳转到 osu! 官网查看详情。若存在自定义 Mod 配置，将随图卡展示。
          </p>
        </div>
      </div>
    </div>
  );
}