import type { MapSelection } from "@/lib/types";
import { cn, fmt } from "@/lib/utils";

export type CardStatus = "normal" | "picked" | "banned" | "active";

export function slotLabel(map: MapSelection): string {
  return map.modPosition ?? map.selectedMods ?? "NM";
}

function fmtLength(seconds: number | null): string {
  if (seconds == null) return "-";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function BeatmapCard({
  map,
  status = "normal",
  compact = false,
  onClick,
  onUndo,
}: {
  map: MapSelection;
  status?: CardStatus;
  compact?: boolean;
  onClick?: () => void;
  onUndo?: () => void;
}) {
  const slot = slotLabel(map);
  const title = [map.artist, map.version].filter(Boolean).join(" - ") || map.title || "未知曲目";
  const clickable = !!(onClick || onUndo);

  const statusRing = {
    normal: "border-2 border-[#e0d8cc]",
    picked: "border-4 border-[#5cb8a5]",
    banned: "border-4 border-[#f5c040]",
    active: "border-4 border-[#6b7fb5]",
  }[status];

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onContextMenu={(e) => {
        if (onUndo) {
          e.preventDefault();
          onUndo();
        }
      }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[6px_6px_0px_rgba(0,0,0,0.12)]",
        compact ? "min-h-[150px]" : "min-h-[190px]",
        statusRing,
        onClick && "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_rgba(0,0,0,0.14)]",
        status === "active" && "ring-4 ring-[#6b7fb5]/40",
      )}
    >
      {map.coverUrl ? (
        <div className={cn("relative w-full overflow-hidden", compact ? "h-16" : "h-24")}>
          <img
            src={map.coverUrl}
            alt={map.title}
            className="h-full w-full object-cover"
            draggable={false}
          />
          {status !== "normal" && (
            <span className="absolute left-1.5 top-1.5 rounded-lg bg-[#fdf6ee]/95 px-2 py-0.5 text-[11px] font-bold text-[#2d2d2d] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
              {status === "picked" || status === "active" ? "已选" : "已禁"}
            </span>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "relative flex w-full items-center justify-center",
            compact ? "h-16" : "h-24",
            map.isCustome ? "bg-[#f5c040]/25" : map.isOrigin ? "bg-[#6b7fb5]/20" : "bg-[#e85d75]/15",
          )}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="rounded-lg bg-[#fdf6ee]/90 px-2.5 py-1 text-xs font-black text-[#2d2d2d] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
              {slot}
            </span>
            <span className="text-[10px] font-bold text-[#666666]">示意占位</span>
          </div>
        </div>
      )}

      <div className={cn("flex flex-1 flex-col gap-1.5", compact ? "px-2.5 py-2" : "px-3 py-2.5")}>
        <p className={cn("line-clamp-2 font-bold leading-snug text-[#2d2d2d]", compact ? "text-xs" : "text-sm")}>
          {title}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-md bg-[#e85d75]/10 px-1.5 py-0.5 font-bold text-[#e85d75]">
            {fmt(map.starRating)}★
          </span>
          <span className="rounded-md bg-[#f5c040]/15 px-1.5 py-0.5 font-bold text-[#2d2d2d]">
            {fmtLength(map.totalLength)}
          </span>
        </div>
        {onUndo && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            className="rounded-lg bg-[#e85d75] px-1.5 py-0.5 text-[10px] font-bold text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
          >
            撤销
          </button>
        )}
      </div>
    </div>
  );
}