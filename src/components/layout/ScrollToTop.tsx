import { useEffect } from "react";
import { PAGE_SWAP_EVENT } from "@/components/layout/PageTransition";

/**
 * 切换页面后滚动到顶部。
 *
 * 页面转场时，内容切换（及滚动复位）发生在幕布完全遮挡屏幕的那一刻
 * （PAGE_SWAP_EVENT），避免旧页面在幕布落下前就跳回顶部。
 */
export default function ScrollToTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const onSwap = () => window.scrollTo({ top: 0, behavior: "auto" });
    window.addEventListener(PAGE_SWAP_EVENT, onSwap);
    return () => window.removeEventListener(PAGE_SWAP_EVENT, onSwap);
  }, []);
  return null;
}
