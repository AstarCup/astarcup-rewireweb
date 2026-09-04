import type { MapSelection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BeatmapCard, type CardStatus } from "./BeatmapCard";
import type { CurrentAction } from "./useObsController";
import { PHASE_LABEL, type BanPickPhase } from "./types";

function MapGridCard({
  map,
  status,
  compact,
  onApply,
  onUndo,
}: {
  map: MapSelection;
  status: CardStatus;
  compact: boolean;
  onApply: () => void;
  onUndo: () => void;
}) {
  return (
    <BeatmapCard
      map={map}
      status={status}
      compact={compact}
      onClick={onApply}
      onUndo={onUndo}
    />
  );
}

export function MapPoolGrid({
  maps,
  pickedIds,
  bannedIds,
  activeMapId,
  currentAction,
  phase,
  compact = false,
  onApplyTarget,
  onUndoMap,
  actionEnabled,
}: {
  maps: MapSelection[];
  pickedIds: Set<number>;
  bannedIds: Set<number>;
  activeMapId: number | null;
  currentAction: CurrentAction | null;
  phase: BanPickPhase;
  compact?: boolean;
  onApplyTarget: (map: MapSelection) => void;
  onUndoMap: (map: MapSelection) => void;
  actionEnabled: boolean;
}) {
  const actionText = currentAction
    ? `${currentAction.team === "red" ? "红方" : "蓝方"}${currentAction.type === "ban" ? "禁用" : "选择"}`
    : "（未选择操作）";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="rounded-md bg-white px-2 py-0.5 font-bold text-[#2d2d2d] shadow-[2px_2px_0px_rgba(0,0,0,0.08)]">
          阶段：{PHASE_LABEL[phase]}
        </span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.08)]",
            actionEnabled
              ? "bg-[#6b7fb5] text-[#fdf6ee]"
              : "bg-white text-[#b0a898]",
          )}
        >
          操作：{actionText}
        </span>
        <span className="flex items-center gap-1.5 font-bold text-[#666666]">
          <i className="h-2.5 w-2.5 inline-block rounded-sm bg-[#f5c040]" /> 已禁
        </span>
        <span className="flex items-center gap-1.5 font-bold text-[#666666]">
          <i className="h-2.5 w-2.5 inline-block rounded-sm bg-[#5cb8a5]" /> 已选
        </span>
        <span className="flex items-center gap-1.5 font-bold text-[#666666]">
          <i className="h-2.5 w-2.5 inline-block rounded-sm bg-[#6b7fb5]" /> 进行中
        </span>
        <span className="text-[#b0a898]">右键卡片可撤销</span>
      </div>

      <div
        className={cn(
          "grid gap-3",
          compact ? "grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
        )}
      >
        {maps.map((m) => {
          const id = m.id;
          const banned = bannedIds.has(id);
          const picked = pickedIds.has(id);
          const active = id === activeMapId;
          const status: CardStatus = banned
            ? "banned"
            : active
              ? "active"
              : picked
                ? "picked"
                : "normal";
          return (
            <MapGridCard
              key={`${m.id}-${m.beatmapId}`}
              map={m}
              status={status}
              compact={compact}
              onApply={() => onApplyTarget(m)}
              onUndo={() => onUndoMap(m)}
            />
          );
        })}
      </div>
    </div>
  );
}