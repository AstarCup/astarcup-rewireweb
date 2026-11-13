import { MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CursorToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

/** 左下角的全局开关：控制 osu!lazer 风格自定义光标（含可点击元素的指示框） */
export default function CursorToggle({ enabled, onToggle }: CursorToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      title={enabled ? "关闭自定义光标" : "开启自定义光标"}
      className={cn(
        "cursor-toggle fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full border-2 px-3.5 py-2 text-xs font-bold transition-all duration-200",
        "shadow-[3px_3px_0px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pc-primary/40",
        enabled
          ? "border-pc-primary bg-(--pc-white) text-(--pc-ink)"
          : "border-(--pc-border) bg-(--pc-white)/90 text-(--pc-faint)",
      )}
    >
      <MousePointer2
        className={cn("h-3.5 w-3.5", enabled ? "text-pc-primary" : "text-(--pc-faint)")}
      />
      光标
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          enabled ? "bg-pc-primary text-pc-cream" : "bg-(--pc-border) text-(--pc-ink)",
        )}
      >
        {enabled ? "开" : "关"}
      </span>
    </button>
  );
}
