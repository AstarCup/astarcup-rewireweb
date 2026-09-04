import { cn } from "@/lib/utils";
import type { OBSTeam, TeamKey } from "./types";

const ACCENT: Record<TeamKey, string> = { red: "#e85d75", blue: "#6b7fb5" };
const ACCENT_SOFT: Record<TeamKey, string> = { red: "bg-[#e85d75]/10", blue: "bg-[#6b7fb5]/10" };

export function TeamDisplay({
  team,
  color,
  isWinner = false,
}: {
  team: OBSTeam;
  color: TeamKey;
  isWinner?: boolean;
}) {
  const accent = ACCENT[color];
  return (
    <div
      className={cn(
        "relative flex w-[600px] flex-col rounded-3xl bg-white p-8 shadow-[6px_6px_0px_rgba(0,0,0,0.12)]",
        isWinner && "ring-8",
      )}
      style={{ borderColor: accent }}
    >
      {isWinner && (
        <span
          className="absolute -top-3 right-6 rounded-xl px-3 py-1 text-sm font-black text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.15)]"
          style={{ backgroundColor: accent }}
        >
          冠军
        </span>
      )}
      <div className="flex items-center justify-center gap-3">
        <span className="h-4 w-4 rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.15)]" style={{ backgroundColor: accent }} />
        <h3 className="line-clamp-1 text-center text-3xl font-black text-[#2d2d2d]">{team.name || "未命名战队"}</h3>
      </div>
      <div className="my-4 text-center font-sans text-8xl font-black leading-none" style={{ color: accent }}>
        {String(team.score).padStart(2, "0")}
      </div>
      {team.players.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t-2 border-[#e0d8cc] pt-4">
          {team.players.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              {p.avatarUrl ? (
                <img
                  src={p.avatarUrl}
                  alt={p.username || "?"}
                  className="h-9 w-9 rounded-full border-2 border-white shadow-[2px_2px_0px_rgba(0,0,0,0.12)]"
                />
              ) : (
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.12)]",
                    ACCENT_SOFT[color],
                  )}
                  style={{ backgroundColor: accent }}
                >
                  {(p.username || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-[180px] truncate text-base font-bold text-[#2d2d2d]">
                {p.username || "未命名"}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-auto rounded-2xl px-4 py-1.5 text-center text-sm font-bold" style={{ backgroundColor: accent, color: "#fdf6ee" }}>
        {color === "red" ? "红方" : "蓝方"}
      </div>
    </div>
  );
}