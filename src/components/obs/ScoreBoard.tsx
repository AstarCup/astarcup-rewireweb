import type { MapSelection } from "@/lib/types";
import { fmt } from "@/lib/utils";
import { RollDisplay } from "./RollDisplay";
import { TeamDisplay } from "./TeamDisplay";
import { TimerDisplay } from "./TimerDisplay";
import { slotLabel } from "./BeatmapCard";
import type { OBSRoll, OBSTeam } from "./types";

function ActiveMap({ map }: { map: MapSelection }) {
  return (
    <div className="mt-3 flex max-w-[460px] flex-col items-center gap-1">
      <span className="rounded-lg bg-[#6b7fb5] px-2 py-0.5 text-xs font-bold text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
        正在进行的选图
      </span>
      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-1.5 shadow-[3px_3px_0px_rgba(0,0,0,0.1)]">
        <span className="rounded-md bg-[#5cb8a5] px-2 py-0.5 text-sm font-black text-[#fdf6ee]">
          {slotLabel(map)}
        </span>
        <span className="max-w-[300px] truncate text-base font-bold text-[#2d2d2d]">
          {map.title || "未命名图"}
        </span>
        <span className="font-sans text-sm font-black text-[#e85d75]">{fmt(map.starRating)}★</span>
      </div>
    </div>
  );
}

export function ScoreBoard({
  red,
  blue,
  timer,
  roll,
  currentActiveMap,
  winner,
}: {
  red: OBSTeam;
  blue: OBSTeam;
  timer: { running: boolean; seconds: number; label: string };
  roll: OBSRoll;
  currentActiveMap: MapSelection | null;
  winner: "red" | "blue" | null;
}) {
  return (
    <div className="flex items-stretch justify-center gap-10">
      <TeamDisplay team={red} color="red" isWinner={winner === "red"} />
      <div className="flex w-[520px] flex-col items-center justify-center gap-2 py-2">
        <span className="font-display text-7xl font-black text-[#2d2d2d] drop-shadow-sm">VS</span>
        <TimerDisplay timer={timer} large />
        <RollDisplay roll={roll} redName={red.name} blueName={blue.name} />
        {currentActiveMap && <ActiveMap map={currentActiveMap} />}
      </div>
      <TeamDisplay team={blue} color="blue" isWinner={winner === "blue"} />
    </div>
  );
}