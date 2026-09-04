import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, fmtInt } from "@/lib/utils";
import type { DisplayScore } from "@/lib/types";

export interface ModColumnInfo {
  key: string;
  label: string;
  mods: string;
  coverUrl?: string | null;
  beatmapIds: number[];
}

interface PlayerRow {
  key: string;
  username: string;
  avatarUrl?: string | null;
  approved: boolean;
  scores: Record<string, number>;
  samples: Record<string, DisplayScore>;
  ranks: Record<string, number | null>;
  played: number;
  totalScore: number;
  zScores: Record<string, number | null>;
  zSum: number;
  rating: number;
}

function rankColor(rank: number | null): string {
  if (rank === 1) return "text-[#f5c040]";
  if (rank === 2) return "text-[#9aa5b1]";
  if (rank === 3) return "text-[#e0a47e]";
  return "text-[#2d2d2d]";
}

function ScoreHover({ sample }: { sample?: DisplayScore }) {
  if (!sample) return null;
  const stats = sample.statistics;
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 hidden w-56 -translate-x-1/2 rounded-xl border-2 border-[#e0d8cc] bg-white p-3 text-xs shadow-[4px_4px_0px_rgba(0,0,0,0.12)] group-hover:block">
      <div className="flex justify-between">
        <span className="text-[#666666]">ACC</span>
        <span className="font-mono font-bold text-[#6b7fb5]">
          {(sample.accuracy * 100).toFixed(2)}%
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-[#666666]">MaxCombo</span>
        <span className="font-mono font-bold text-[#2d2d2d]">
          {fmtInt(sample.maxCombo)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 border-t border-[#e0d8cc] pt-2 text-center">
        {[
          ["300", stats.count300, "text-[#6b7fb5]"],
          ["100", stats.count100, "text-[#5cb8a5]"],
          ["50", stats.count50, "text-[#f5c040]"],
          ["Miss", stats.countMiss, "text-[#e85d75]"],
        ].map(([label, val, color]) => (
          <div key={label as string}>
            <p className="text-[#b0a898]">{label}</p>
            <p className={cn("font-mono font-bold", color as string)}>
              {fmtInt(val as number)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-[#e0d8cc] pt-2">
        <span className="text-[#666666]">Rank</span>
        <span className="font-bold text-[#2d2d2d]">{sample.rank}</span>
      </div>
    </div>
  );
}

type SortKey = "totalScore" | "zSum" | "rating" | "username" | string;

export function ModAggregateTable({
  scores,
  columns,
  isApproved,
  onlyApproved,
}: {
  scores: DisplayScore[];
  columns: ModColumnInfo[];
  isApproved: (s: DisplayScore) => boolean;
  onlyApproved: boolean;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("totalScore");
  const [sortDesc, setSortDesc] = useState(true);

  const colByBeatmap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of columns) for (const bid of c.beatmapIds) m.set(bid, c.key);
    return m;
  }, [columns]);

  const rows = useMemo<PlayerRow[]>(() => {
    const byKey = new Map<string, PlayerRow>();
    const ensure = (s: DisplayScore): PlayerRow => {
      const key = s.username || String(s.userId ?? 0);
      const existing = byKey.get(key);
      if (existing) return existing;
      const r: PlayerRow = {
        key,
        username: s.username || `#${s.userId ?? ""}`,
        avatarUrl: s.avatarUrl,
        approved: false,
        scores: {},
        samples: {},
        ranks: {},
        zScores: {},
        played: 0,
        totalScore: 0,
        zSum: 0,
        rating: 0,
      };
      byKey.set(key, r);
      return r;
    };
    for (const s of scores) {
      if (onlyApproved && !isApproved(s)) continue;
      const ck = colByBeatmap.get(s.beatmapId);
      if (!ck) continue;
      const r = ensure(s);
      if (!r.approved && isApproved(s)) r.approved = true;
      const prev = r.scores[ck];
      if (prev == null || s.totalScore > prev) {
        r.scores[ck] = s.totalScore;
        r.samples[ck] = s;
      }
    }
    // Per-column ranks & z-scores.
    for (const c of columns) {
      const players = Array.from(byKey.values()).filter(
        (r) => r.scores[c.key] != null,
      );
      players.sort((a, b) => (b.scores[c.key] ?? 0) - (a.scores[c.key] ?? 0));
      let rank = 1;
      let last = players[0]?.scores[c.key];
      players.forEach((p, i) => {
        if (p.scores[c.key] !== last) {
          rank = i + 1;
          last = p.scores[c.key];
        }
        p.ranks[c.key] = rank;
      });
      const vals = players.map((p) => p.scores[c.key] ?? 0);
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const variance = vals.length
        ? vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length
        : 0;
      const std = Math.sqrt(variance);
      for (const p of players) {
        p.zScores ??= {};
        if (vals.length < 2 || std === 0) p.zScores[c.key] = 0;
        else p.zScores[c.key] = ((p.scores[c.key] ?? 0) - mean) / std;
      }
    }
    for (const r of byKey.values()) {
      r.played = Object.keys(r.scores).length;
      r.totalScore = Object.values(r.scores).reduce((a, b) => a + b, 0);
      const zs = Object.values(r.zScores ?? {}).filter(
        (z): z is number => z != null,
      );
      r.zSum = zs.reduce((a, b) => a + b, 0);
      r.rating = zs.length ? r.zSum / zs.length : 0;
    }
    return Array.from(byKey.values());
  }, [scores, columns, colByBeatmap, isApproved, onlyApproved]);

  const colAvgs = useMemo(() => {
    const avgs: Record<string, number> = {};
    for (const c of columns) {
      const vals = rows
        .filter((r) => r.scores[c.key] != null)
        .map((r) => r.scores[c.key] ?? 0);
      avgs[c.key] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }
    return avgs;
  }, [rows, columns]);

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "username") cmp = a.username.localeCompare(b.username);
      else if (sortBy === "totalScore") cmp = a.totalScore - b.totalScore;
      else if (sortBy === "zSum") cmp = a.zSum - b.zSum;
      else if (sortBy === "rating") cmp = a.rating - b.rating;
      else cmp = (a.scores[sortBy] ?? 0) - (b.scores[sortBy] ?? 0);
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [rows, sortBy, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDesc((v) => !v);
    else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortBy !== column) return null;
    return sortDesc ? (
      <ArrowDown className="inline h-3.5 w-3.5" />
    ) : (
      <ArrowUp className="inline h-3.5 w-3.5" />
    );
  };

  if (columns.length === 0 || sorted.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
        <p className="font-sans text-sm text-[#b0a898]">暂无符合条件的成绩</p>
      </div>
    );
  }

  const thClass =
    "px-3 py-3 text-center font-bold text-[#666666] whitespace-nowrap";

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-[#e0d8cc] bg-[#fdf6ee]">
            <th className={cn(thClass, "cursor-pointer")} onClick={() => handleSort("totalScore")}>
              位次 <SortIcon column="totalScore" />
            </th>
            <th className={cn(thClass, "cursor-pointer")} onClick={() => handleSort("username")}>
              选手 <SortIcon column="username" />
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => handleSort(c.key)}
                className={cn(thClass, "relative cursor-pointer overflow-hidden")}
              >
                {c.coverUrl && (
                  <img
                    src={c.coverUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-30"
                  />
                )}
                <span className="relative z-10 rounded-lg bg-white/80 px-2 py-0.5 shadow-sm">
                  {c.label}
                </span>
                {colAvgs[c.key] > 0 && (
                  <span className="relative z-10 mt-0.5 block text-[10px] font-normal text-[#b0a898]">
                    avg {fmtInt(colAvgs[c.key])}
                  </span>
                )}
              </th>
            ))}
            <th className={cn(thClass, "cursor-pointer")} onClick={() => handleSort("zSum")}>
              zSum <SortIcon column="zSum" />
            </th>
            <th className={cn(thClass, "cursor-pointer")} onClick={() => handleSort("rating")}>
              Rating <SortIcon column="rating" />
            </th>
            <th className={cn(thClass, "cursor-pointer")} onClick={() => handleSort("totalScore")}>
              总分 <SortIcon column="totalScore" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={r.key}
              className={cn(
                "border-b border-[#e0d8cc]/60 transition-colors",
                r.approved ? "bg-[#5cb8a5]/5" : "hover:bg-[#fdf6ee]",
              )}
            >
              <td
                className={cn(
                  "px-3 py-3 text-center font-sans font-bold",
                  i === 0 ? "text-[#e85d75]" : i === 1 ? "text-[#f5c040]" : "text-[#666666]",
                )}
              >
                {i + 1}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2.5">
                  {r.avatarUrl ? (
                    <img
                      src={r.avatarUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f5c040]/30 text-xs font-bold text-[#2d2d2d]">
                      {(r.username || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-[#2d2d2d]">{r.username}</span>
                  {r.approved && <Badge variant="teal">参赛</Badge>}
                </div>
              </td>
              {columns.map((c) => {
                const score = r.scores[c.key];
                const rank = r.ranks[c.key] ?? null;
                return (
                  <td key={c.key} className="group relative px-3 py-3 text-center font-mono">
                    {score != null ? (
                      <>
                        <span className={cn("cursor-help text-sm", rankColor(rank))}>
                          {fmtInt(score)}
                        </span>
                        <ScoreHover sample={r.samples[c.key]} />
                      </>
                    ) : (
                      <span className="text-[#b0a898]">-</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-3 text-center font-mono font-bold text-[#2d2d2d]">
                {r.zSum.toFixed(2)}
              </td>
              <td className="px-3 py-3 text-center font-mono font-bold text-[#2d2d2d]">
                {r.rating.toFixed(2)}
              </td>
              <td className="px-3 py-3 text-center font-mono font-bold text-[#2d2d2d]">
                {fmtInt(r.totalScore)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
