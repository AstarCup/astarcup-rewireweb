import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** 页面滚动超过该距离后才出现浮动按钮 */
const SHOW_AFTER = 320;

/** 全局右下角「回到顶部」浮动按钮。 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="回到顶部"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "group fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full border-2 border-(--pc-border)",
        "bg-(--pc-white) text-(--pc-ink) shadow-[3px_3px_0px_rgba(0,0,0,0.12)]",
        "transition-all duration-300 hover:bg-(--pc-paper) hover:shadow-[4px_4px_0px_rgba(0,0,0,0.14)] active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pc-primary/40",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}
