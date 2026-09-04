import { cn } from "@/lib/utils";
import type { OBSTeam, TeamKey } from "./types";

export function VictoryDisplay({
  winner,
  teams,
}: {
  winner: TeamKey;
  teams: { red: OBSTeam; blue: OBSTeam };
}) {
  const accent = winner === "red" ? "#e85d75" : "#6b7fb5";
  const name = teams[winner].name || (winner === "red" ? "红方" : "蓝方");
  const score = teams[winner].score;
  const otherScore = teams[winner === "red" ? "blue" : "red"].score;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="paper-animate-in relative flex -rotate-2 flex-col items-center rounded-[2.5rem] bg-white px-20 py-12 text-center shadow-[12px_12px_0px_rgba(0,0,0,0.18)]">
        <span
          className="absolute -left-4 -top-4 h-16 w-16 rotate-12 rounded-2xl opacity-25"
          style={{ backgroundColor: accent }}
        />
        <span
          className="absolute -bottom-4 -right-4 h-12 w-12 -rotate-12 rounded-xl bg-[#f5c040] opacity-40"
        />
        <div className="text-7xl">🎉</div>
        <h2 className="mt-3 text-6xl font-black text-[#2d2d2d]">{name}</h2>
        <p className="mt-1 text-2xl font-bold text-[#666666]">获得本场比赛胜利</p>
        <div
          className="mt-5 rounded-2xl px-8 py-2 font-sans text-4xl font-black text-[#fdf6ee] shadow-[4px_4px_0px_rgba(0,0,0,0.15)]"
          style={{ backgroundColor: accent }}
        >
          {score} : {otherScore}
        </div>
        <span className={cn("mt-4 rounded-xl px-3 py-1 text-lg font-bold text-[#fdf6ee]")} style={{ backgroundColor: accent }}>
          {winner === "red" ? "红方" : "蓝方"}胜利
        </span>
      </div>
    </div>
  );
}