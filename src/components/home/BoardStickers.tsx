import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMOJI_MAP } from "@/lib/emoji-data";
import type { CanvasSticker } from "@/lib/types";

/** 贴纸基准尺寸（画布坐标系像素） */
const BASE = 96;
export const BOARD_W = 1600;
export const BOARD_H = 900;
/** 可贴范围：比 1600×900 的板子再往外扩，覆盖整张背景图（背景 3000×2300，偏移 -700,-700） */
export const STICKER_BOUNDS = { minX: -800, maxX: 2400, minY: -800, maxY: 1700 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type Mode = "move" | "scale" | "rotate";

interface DragState {
  mode: Mode;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  oscale: number;
  orot: number;
  startDist: number;
  startAngle: number;
}

interface BoardStickersProps {
  stickers: CanvasSticker[];
  boardScale: number;
  selectedId: number | null;
  editable: (s: CanvasSticker) => boolean;
  onSelect: (id: number | null) => void;
  onDraft: (
    id: number,
    patch: Partial<Pick<CanvasSticker, "x" | "y" | "scale" | "rotation">>,
  ) => void;
  onCommit: (id: number) => void;
  onDelete: (s: CanvasSticker) => void;
}

function StickerItem({
  sticker: s,
  boardScale,
  selected,
  canEdit,
  onSelect,
  onDraft,
  onCommit,
  onDelete,
}: {
  sticker: CanvasSticker;
  boardScale: number;
  selected: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onDraft: BoardStickersProps["onDraft"];
  onCommit: BoardStickersProps["onCommit"];
  onDelete: BoardStickersProps["onDelete"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<DragState | null>(null);
  const src = EMOJI_MAP[s.token];
  const size = BASE * s.scale;
  // 手柄按屏幕像素固定大小（画布整体有缩放，这里反算）
  const handle = 13 / Math.max(0.2, boardScale);

  const begin = (mode: Mode) => (e: ReactPointerEvent) => {
    if (!canEdit) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    gesture.current = {
      mode,
      sx: e.clientX,
      sy: e.clientY,
      ox: s.x,
      oy: s.y,
      oscale: s.scale,
      orot: s.rotation,
      startDist: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)),
      startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || !ref.current) return;
    e.stopPropagation();
    if (g.mode === "move") {
      onDraft(s.id, {
        x: clamp(g.ox + (e.clientX - g.sx) / boardScale, STICKER_BOUNDS.minX, STICKER_BOUNDS.maxX),
        y: clamp(g.oy + (e.clientY - g.sy) / boardScale, STICKER_BOUNDS.minY, STICKER_BOUNDS.maxY),
      });
      return;
    }
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (g.mode === "scale") {
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      onDraft(s.id, { scale: clamp((g.oscale * dist) / g.startDist, 0.35, 3) });
    } else {
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const deg = g.orot + ((angle - g.startAngle) * 180) / Math.PI;
      onDraft(s.id, { rotation: deg });
    }
  };

  const end = () => {
    if (!gesture.current) return;
    gesture.current = null;
    onCommit(s.id);
  };

  if (!src) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-auto absolute touch-none select-none",
        selected ? "z-20" : "z-10",
      )}
      style={{
        left: s.x,
        top: s.y,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
      }}
      onPointerDown={begin("move")}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
      title={canEdit ? "拖动移动，右下角缩放，上方圆点旋转" : `:${s.token}:`}
    >
      <img
        src={src}
        alt={s.token}
        draggable={false}
        loading="lazy"
        decoding="async"
        className="pointer-events-none h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.28)]"
      />

      {selected && canEdit && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed border-pc-primary/90" />
          {/* 旋转：上方圆点 */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 bg-pc-primary/70"
            style={{
              width: 2,
              height: handle * 1.6,
              top: -handle * 1.6,
              transform: "translateX(-50%)",
            }}
          />
          <button
            type="button"
            aria-label="旋转"
            onPointerDown={begin("rotate")}
            onPointerMove={onMove}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute left-1/2 grid cursor-grab place-items-center rounded-full border-2 border-white bg-pc-primary shadow"
            style={{
              width: handle,
              height: handle,
              top: -handle * 2.2,
              transform: "translateX(-50%)",
            }}
          />
          {/* 缩放：右下角 */}
          <button
            type="button"
            aria-label="缩放"
            onPointerDown={begin("scale")}
            onPointerMove={onMove}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute grid cursor-nwse-resize place-items-center rounded-full border-2 border-white bg-pc-primary shadow"
            style={{ width: handle, height: handle, right: -handle / 2, bottom: -handle / 2 }}
          />
          {/* 删除：右上角 */}
          <button
            type="button"
            aria-label="删除表情"
            title="删除这个表情"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(s);
            }}
            className="absolute grid place-items-center rounded-full border-2 border-white bg-(--pc-ink) text-white shadow hover:bg-pc-primary"
            style={{ width: handle, height: handle, right: -handle / 2, top: -handle / 2 }}
          >
            <X style={{ width: handle * 0.55, height: handle * 0.55 }} />
          </button>
        </>
      )}
    </div>
  );
}

/** 画布贴纸层：绝对定位在 1600×900 画布坐标系里 */
export default function BoardStickers({
  stickers,
  boardScale,
  selectedId,
  editable,
  onSelect,
  onDraft,
  onCommit,
  onDelete,
}: BoardStickersProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {stickers.map((s) => (
        <StickerItem
          key={s.id}
          sticker={s}
          boardScale={boardScale}
          selected={selectedId === s.id}
          canEdit={editable(s)}
          onSelect={() => onSelect(s.id)}
          onDraft={onDraft}
          onCommit={onCommit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
