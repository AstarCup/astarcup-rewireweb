import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPoolGrid } from "./MapPoolGrid";
import type { ObsController } from "./useObsController";
import { bansPerTeam, PHASE_LABEL, winScore, type BanPickPhase } from "./types";

function ActionButton({
  label,
  active,
  variant,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  variant: "red" | "blue";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={variant === "red" ? "destructive" : "outline"}
      className={cn(active && (variant === "red" ? "ring-4 ring-[#f5c040]/70" : "ring-4 ring-[#f5c040]/70"))}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function BanPickControls({ ctl }: { ctl: ObsController }) {
  const bp = ctl.state.banPick;
  const bo = ctl.state.match.boFormat;
  const target = winScore(bo);
  const bans = bansPerTeam(bo);
  const phase: BanPickPhase = bp.phase;
  const action = ctl.currentAction;
  const actionEnabled = phase !== "done" && action !== null;

  const phaseColor =
    phase === "ban" ? "bg-[#f5c040] text-[#2d2d2d]" : phase === "pick" ? "bg-[#6b7fb5] text-[#fdf6ee]" : "bg-[#5cb8a5] text-[#fdf6ee]";

  const pickedIds = new Set(bp.picked.map((m) => m.id));
  const bannedIds = new Set(bp.banned.map((m) => m.id));

  const setAction = (team: "red" | "blue", type: "ban" | "pick") =>
    ctl.setCurrentAction({ team, type });

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[6px_6px_0px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("rounded-lg px-3 py-1 text-sm font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.1)]", phaseColor)}>
          阶段：{PHASE_LABEL[phase]}
        </span>
        <span className="text-sm font-bold text-[#2d2d2d]">
          当前回合：
          <span className="text-[#e85d75]">{bp.currentTeam === "red" ? "红方" : "蓝方"}</span>
        </span>
        <span className="text-sm font-bold text-[#666666]">
          禁：红 {bp.redRemaining}/{bans} · 蓝 {bp.blueRemaining}/{bans}
        </span>
        <span className="text-sm font-bold text-[#666666]">
          选择：{bp.picked.length}/{target}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="红方禁用"
          variant="red"
          active={action?.team === "red" && action?.type === "ban"}
          disabled={phase === "done"}
          onClick={() => setAction("red", "ban")}
        />
        <ActionButton
          label="蓝方禁用"
          variant="blue"
          active={action?.team === "blue" && action?.type === "ban"}
          disabled={phase === "done"}
          onClick={() => setAction("blue", "ban")}
        />
        <ActionButton
          label="红方选择"
          variant="red"
          active={action?.team === "red" && action?.type === "pick"}
          disabled={phase === "done"}
          onClick={() => setAction("red", "pick")}
        />
        <ActionButton
          label="蓝方选择"
          variant="blue"
          active={action?.team === "blue" && action?.type === "pick"}
          disabled={phase === "done"}
          onClick={() => setAction("blue", "pick")}
        />
        <Button variant="outline" onClick={() => ctl.setCurrentAction(null)} disabled={!action}>
          取消操作
        </Button>
      </div>

      <MapPoolGrid
        maps={ctl.maps}
        pickedIds={pickedIds}
        bannedIds={bannedIds}
        activeMapId={bp.phase === "pick" || bp.phase === "done" ? ctl.state.currentActiveMap?.id ?? null : null}
        currentAction={action}
        phase={phase}
        actionEnabled={actionEnabled}
        onApplyTarget={(map) => {
          if (action) ctl.applyAction(action, map);
        }}
        onUndoMap={ctl.undoMap}
      />
    </div>
  );
}