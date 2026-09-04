import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, fmtInt } from "@/lib/utils";
import type { DisplayScore } from "@/lib/types";
import { ModBadges } from "./modBadges";

/** Accuracy: osu returns a 0..1 fraction; tolerate already-percent values. */
function accuracyPercent(acc: number): string {
  const v = acc > 1 ? acc : acc * 100;
  return `${v.toFixed(2)}%`;
}

function PlayerCell({ score, approved }: { score: DisplayScore; approved: boolean }) {
  return (
    <td className={cn("px-4 py-3", approved && "bg-[#5cb8a5]/10")}>
      <div className="flex items-center gap-2.5">
        {score.avatarUrl ? (
          <img
            src={score.avatarUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f5c040]/30 text-xs font-bold text-[#2d2d2d]">
            {(score.username || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <span className={cn("font-bold text-[#2d2d2d]", approved && "text-[#2d2d2d]")}>
          {score.username}
        </span>
        {approved && (
          <Badge variant="teal" className="shrink-0">
            参赛
          </Badge>
        )}
      </div>
    </td>
  );
}

export interface ScoreTableProps {
  scores: DisplayScore[];
  isApproved?: (s: DisplayScore) => boolean;
  onlyApproved?: boolean;
  /** flat = render the bare <table> (for embedding in a Card). */
  variant?: "boxed" | "flat";
  className?: string;
}

/** A ranked, paper-style score table sorted by totalScore (rank recomputed). */
export function ScoreTable({
  scores,
  isApproved,
  onlyApproved = false,
  variant = "boxed",
  className,
}: ScoreTableProps) {
  const rows = useMemo(() => {
    const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    const withRank = sorted.map((s, i) => ({ s, pos: i + 1 }));
    return onlyApproved ? withRank.filter((r) => isApproved?.(r.s) ?? true) : withRank;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, onlyApproved, isApproved]);

  const table = (
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead>
        <tr className="border-b-2 border-[#e0d8cc] bg-[#fdf6ee]">
          <th className="px-4 py-3 font-bold text-[#666666]">位次</th>
          <th className="px-4 py-3 font-bold text-[#666666]">选手</th>
          <th className="px-4 py-3 font-bold text-[#666666]">准确率</th>
          <th className="px-4 py-3 font-bold text-[#666666]">最大连击</th>
          <th className="px-4 py-3 font-bold text-[#666666]">MOD</th>
          <th className="px-4 py-3 font-bold text-[#666666]">总分</th>
          <th className="px-4 py-3 font-bold text-[#666666]">结果</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ s, pos }) => {
          const approved = (isApproved?.(s) ?? false) && !onlyApproved;
          return (
            <tr
              key={`${s.userId}-${s.beatmapId}-${s.position ?? pos}`}
              className={cn(
                "border-b border-[#e0d8cc]/60 transition-colors",
                approved ? "bg-[#5cb8a5]/5 hover:bg-[#5cb8a5]/10" : "hover:bg-[#fdf6ee]",
              )}
            >
              <td className={cn("px-4 py-3 font-sans font-bold", pos === 1 ? "text-[#e85d75]" : pos === 2 ? "text-[#f5c040]" : "text-[#666666]")}>
                {pos}
              </td>
              <PlayerCell score={s} approved={approved} />
              <td className="px-4 py-3 font-sans font-bold text-[#6b7fb5]">
                {accuracyPercent(s.accuracy)}
              </td>
              <td className="px-4 py-3 font-sans text-[#666666]">{fmtInt(s.maxCombo)}</td>
              <td className="px-4 py-3">
                <ModBadges mods={s.mods} />
              </td>
              <td className="px-4 py-3 font-sans font-bold text-[#2d2d2d]">
                {fmtInt(s.totalScore)}
              </td>
              <td className="px-4 py-3">
                {s.passed ? (
                  <Badge variant="teal">通过</Badge>
                ) : (
                  <Badge variant="outline">未过</Badge>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  if (variant === "flat") {
    return <div className={cn("overflow-x-auto", className)}>{table}</div>;
  }
  return (
    <div className={cn("overflow-x-auto rounded-2xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.08)]", className)}>
      {table}
    </div>
  );
}