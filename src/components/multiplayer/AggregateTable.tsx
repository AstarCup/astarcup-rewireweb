import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, fmtInt } from "@/lib/utils";

export interface AggregateRow {
  username: string;
  avatarUrl?: string | null;
  played: number;
  totalScore: number;
  approved: boolean;
}

/** Aggregated per-user totals across all playlists. */
export function AggregateTable({ rows }: { rows: AggregateRow[] }) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.totalScore - a.totalScore),
    [rows],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
        <p className="font-sans text-sm text-[#b0a898]">暂无符合条件的成绩</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-[#e0d8cc] bg-[#fdf6ee]">
            <th className="px-4 py-3 font-bold text-[#666666]">位次</th>
            <th className="px-4 py-3 font-bold text-[#666666]">选手</th>
            <th className="px-4 py-3 font-bold text-[#666666]">参赛</th>
            <th className="px-4 py-3 font-bold text-[#666666]">图数</th>
            <th className="px-4 py-3 font-bold text-[#666666]">总分</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-[#e0d8cc]/60 transition-colors",
                r.approved ? "bg-[#5cb8a5]/5" : "hover:bg-[#fdf6ee]",
              )}
            >
              <td
                className={cn(
                  "px-4 py-3 font-sans font-bold",
                  i === 0 ? "text-[#e85d75]" : i === 1 ? "text-[#f5c040]" : "text-[#666666]",
                )}
              >
                {i + 1}
              </td>
              <td className="px-4 py-3">
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
                </div>
              </td>
              <td className="px-4 py-3">
                {r.approved ? <Badge variant="teal">参赛</Badge> : <span className="text-xs text-[#b0a898]">—</span>}
              </td>
              <td className="px-4 py-3 font-sans text-[#666666]">{r.played}</td>
              <td className="px-4 py-3 font-sans font-bold text-[#2d2d2d]">{fmtInt(r.totalScore)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}