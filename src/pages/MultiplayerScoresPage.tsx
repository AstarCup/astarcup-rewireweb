import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/paper/paper";
import { ErrorBlock, LoadingBlock, useAsync, useFetch } from "@/hooks/useFetch";
import { api, qs } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { cn, formatDateTime } from "@/lib/utils";
import {
  MODS_ORDER,
  type DisplayScore,
  type MapSelection,
  type PlayerStub,
  type RoomScoresResponse,
} from "@/lib/types";
import { BeatmapGroup } from "@/components/multiplayer/BeatmapGroup";
import { AggregateTable, type AggregateRow } from "@/components/multiplayer/AggregateTable";
import { buildApprovedInfo, isScoreApproved, type ApprovedInfo } from "@/components/multiplayer/approved";

interface DateRangeOption {
  label: string;
  value: string;
  start?: Date;
  end?: Date;
}

interface PoolGroup {
  beatmapId: number;
  map: MapSelection | undefined;
  scores: DisplayScore[];
  firstAppearance: number;
  modIdx: number;
  modPos: number;
}

/** Derive a start/end date range for each mappool category from selection times. */
function buildCategoryRanges(
  maps: MapSelection[],
): { category: string; start: Date; end: Date }[] {
  const byCat = new Map<string, Date[]>();
  for (const m of maps) {
    if (!m.selectedAt) continue;
    const d = new Date(m.selectedAt);
    if (Number.isNaN(d.getTime())) continue;
    const cat = m.category || "资格赛";
    const list = byCat.get(cat);
    if (list) list.push(d);
    else byCat.set(cat, [d]);
  }
  return Array.from(byCat.entries())
    .map(([category, dates]) => ({
      category,
      start: dates.reduce((a, b) => (a < b ? a : b)),
      end: dates.reduce((a, b) => (a > b ? a : b)),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export default function MultiplayerScoresPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useApp();
  const season = settings?.current_season || "s1";

  const [roomInput, setRoomInput] = useState(() => searchParams.get("room") ?? "");
  const [dateCat, setDateCat] = useState("__all__");
  const [onlyValid, setOnlyValid] = useState(false);
  const [onlyApproved, setOnlyApproved] = useState(false);
  const [poolView, setPoolView] = useState<"card" | "list">("card");
  const [inputError, setInputError] = useState<string | null>(null);

  const mapsFetch = useFetch<MapSelection[]>(() =>
    api.get<MapSelection[]>("/api/map-selections" + qs({ season, approved: true })),
  );
  const approvedFetch = useFetch<PlayerStub[]>(() =>
    api.get<PlayerStub[]>("/api/players" + qs({ status: "approved" })),
  );
  const scores = useAsync<RoomScoresResponse>();

  // Reload the mappool when the season setting finishes loading.
  const skipFirstSeason = useRef(true);
  useEffect(() => {
    if (skipFirstSeason.current) {
      skipFirstSeason.current = false;
      return;
    }
    void mapsFetch.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  const mapByBeatmapId = useMemo(() => {
    const m = new Map<number, MapSelection>();
    for (const x of mapsFetch.data ?? []) m.set(x.beatmapId, x);
    return m;
  }, [mapsFetch.data]);

  const approvedInfo = useMemo<ApprovedInfo>(
    () => buildApprovedInfo(approvedFetch.data ?? []),
    [approvedFetch.data],
  );

  const dateOptions = useMemo<DateRangeOption[]>(() => {
    const ranges = buildCategoryRanges(mapsFetch.data ?? []);
    return [
      { label: "全部时间", value: "__all__" },
      ...ranges.map((r) => ({ label: r.category, value: r.category, start: r.start, end: r.end })),
    ];
  }, [mapsFetch.data]);

  const poolGroups = useMemo<PoolGroup[]>(() => {
    const data = scores.data;
    if (!data) return [];
    const byId = new Map<number, { scores: DisplayScore[]; firstAppearance: number }>();
    data.scores.forEach((s, idx) => {
      const g = byId.get(s.beatmapId) ?? { scores: [] as DisplayScore[], firstAppearance: idx };
      if (!byId.has(s.beatmapId)) byId.set(s.beatmapId, g);
      g.scores.push(s);
    });
    const groups: PoolGroup[] = Array.from(byId.entries()).map(([bid, g]) => {
      const map = mapByBeatmapId.get(bid);
      const base = map?.selectedMods?.split("+")[0]?.toUpperCase() ?? "";
      const modIdx = base ? MODS_ORDER.indexOf(base) : -1;
      return {
        beatmapId: bid,
        map,
        scores: g.scores,
        firstAppearance: g.firstAppearance,
        modIdx,
        modPos: Number(map?.modPosition) || 0,
      };
    });
    groups.sort((a, b) => {
      const aHas = a.modIdx >= 0;
      const bHas = b.modIdx >= 0;
      if (aHas !== bHas) return aHas ? -1 : 1;
      if (aHas) {
        if (a.modIdx !== b.modIdx) return a.modIdx - b.modIdx;
        if (a.modPos !== b.modPos) return a.modPos - b.modPos;
      }
      return a.firstAppearance - b.firstAppearance;
    });
    return groups;
  }, [scores.data, mapByBeatmapId]);

  const aggregateRows = useMemo<AggregateRow[]>(() => {
    const data = scores.data;
    if (!data) return [];
    const byKey = new Map<string, AggregateRow>();
    for (const s of data.scores) {
      if (onlyApproved && !isScoreApproved(approvedInfo, s)) continue;
      const key = s.username || String(s.userId != null ? s.userId : 0);
      const cur = byKey.get(key) ?? {
        username: s.username || `#${s.userId ?? ""}`,
        avatarUrl: s.avatarUrl,
        played: 0,
        totalScore: 0,
        approved: false,
      };
      cur.played += 1;
      cur.totalScore += s.totalScore;
      if (!cur.approved && isScoreApproved(approvedInfo, s)) cur.approved = true;
      byKey.set(key, cur);
    }
    return Array.from(byKey.values());
  }, [scores.data, approvedInfo, onlyApproved]);

  const handleLoad = async () => {
    const ids = roomInput
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      setInputError("请输入有效的房间 ID，多个可用英文逗号分隔");
      return;
    }
    setInputError(null);
    const opt = dateOptions.find((o) => o.value === dateCat);
    const body: Record<string, unknown> = { roomIds: ids, onlyValid };
    if (opt?.start) body.startDate = opt.start.toISOString();
    if (opt?.end) body.endDate = opt.end.toISOString();
    const resolved = ids.join(",");
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (roomInput.trim()) p.set("room", resolved);
      else p.delete("room");
      return p;
    }, { replace: true });
    await scores.run(() => api.post<RoomScoresResponse>("/api/osu/rooms/scores", body));
  };

  // Auto-load a room taken from the `room` URL param once.
  const autoLoadRef = useRef(false);
  useEffect(() => {
    if (autoLoadRef.current) return;
    const initial = searchParams.get("room");
    if (initial && initial.trim()) {
      autoLoadRef.current = true;
      void handleLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderCheckbox = (checked: boolean, onChange: (v: boolean) => void, label: string) => (
    <label className="inline-flex cursor-pointer select-none items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "grid h-5 w-5 place-items-center rounded-lg border-2 border-[#e0d8cc] bg-white text-xs font-bold text-[#fdf6ee] " +
            "shadow-[1px_1px_0px_rgba(0,0,0,0.06)] transition-colors peer-checked:border-[#5cb8a5] peer-checked:bg-[#5cb8a5]",
        )}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="text-sm font-bold text-[#2d2d2d]">{label}</span>
    </label>
  );

  const roomChips = scores.data?.rooms ?? [];

  return (
    <div className="bg-[#fdf6ee]">
      <PageHeader title="多人房分数" subtitle="查看 osu! 多人房的各图排行榜与选手总结，参赛选手以青色标记。" />

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {/* Room controls */}
        <div className="mb-8 rounded-2xl border border-[#e0d8cc] bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-bold text-[#b0a898]">房间 ID（可用英文逗号分隔多个）</span>
              <Input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleLoad();
                }}
                placeholder="例如 2147483647, 2147483648"
                className="w-full"
              />
            </div>
            <Button onClick={() => void handleLoad()} disabled={scores.loading} className="lg:w-40">
              {scores.loading ? "加载中…" : "加载房间"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[#b0a898]">时间范围</span>
              <Select value={dateCat} onValueChange={setDateCat}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="选择时间" />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderCheckbox(onlyValid, setOnlyValid, "仅有效分数")}
            {renderCheckbox(onlyApproved, setOnlyApproved, "仅看参赛选手")}
          </div>
          {inputError && <p className="mt-3 text-xs font-bold text-[#e85d75]">{inputError}</p>}
        </div>

        {/* Idle / loading / error states */}
        {!scores.data && !scores.loading && !scores.error && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-[#b0a898]">
              输入房间 ID 并点击「加载房间」来查看排行榜
            </p>
          </div>
        )}
        {scores.loading && <LoadingBlock label="正在拉取房间成绩…" />}
        {scores.error && <ErrorBlock message={scores.error} onRetry={() => void handleLoad()} />}

        {/* Results */}
        {scores.data && !scores.loading && (
          <>
            {roomChips.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {roomChips.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-[#e0d8cc] bg-white px-3 py-2 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]"
                  >
                    <p className="text-sm font-bold text-[#2d2d2d]">
                      {r.name || `房间 ${r.id}`}
                      {r.participantCount != null && (
                        <span className="ml-2 text-xs font-normal text-[#b0a898]">
                          {r.participantCount} 人
                        </span>
                      )}
                    </p>
                    {(r.startsAt || r.endsAt) && (
                      <p className="text-[10px] text-[#b0a898]">
                        {formatDateTime(r.startsAt)} → {formatDateTime(r.endsAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Tabs defaultValue="pool">
              <TabsList>
                <TabsTrigger value="pool">按图池</TabsTrigger>
                <TabsTrigger value="total">按总分</TabsTrigger>
              </TabsList>

              <TabsContent value="pool">
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1 rounded-xl border-2 border-[#e0d8cc] bg-white p-1 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
                    {(["card", "list"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setPoolView(v)}
                        className={cn(
                          "rounded-lg px-4 py-1.5 text-sm font-bold transition-colors",
                          poolView === v
                            ? "bg-[#6b7fb5] text-[#fdf6ee]"
                            : "bg-transparent text-[#666666] hover:text-[#2d2d2d]",
                        )}
                      >
                        {v === "card" ? "卡片" : "列表"}
                      </button>
                    ))}
                  </div>
                </div>

                {poolGroups.length === 0 ? (
                  <div className="rounded-2xl bg-white p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
                    <p className="font-sans text-sm text-[#b0a898]">该房间暂无可展示的成绩</p>
                  </div>
                ) : (
                  <div
                    className={
                      poolView === "card" ? "flex flex-col gap-7" : "flex flex-col gap-10"
                    }
                  >
                    {poolGroups.map((g, i) => (
                      <BeatmapGroup
                        key={g.beatmapId}
                        index={i + 1}
                        beatmapId={g.beatmapId}
                        map={g.map}
                        scores={g.scores}
                        isApproved={(s) => isScoreApproved(approvedInfo, s)}
                        onlyApproved={onlyApproved}
                        card={poolView === "card"}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="total">
                <AggregateTable rows={aggregateRows} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}