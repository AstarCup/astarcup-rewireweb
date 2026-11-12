import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useOutlet } from "react-router-dom";

/** 页面内容真正切换上屏的那一刻派发（ScrollToTop 等在此时才滚动，避免旧页面提前跳动） */
export const PAGE_SWAP_EVENT = "astarcup:page-swap";

/** 内容切换点：幕布横扫至屏幕中央、完全遮挡的时刻（动画 50% 处） */
const SWAP_MS = 400;
/** 幕布扫出屏幕的总时长（与 index.css 中幕布动画时长保持一致） */
const TOTAL_MS = 800;

/** 路由 → 幕布上展示的下一个页面名（超大描边字） */
const PAGE_TITLES: Array<[RegExp, string]> = [
  [/^\/$/, "首页"],
  [/^\/news(\/|$)/, "资讯"],
  [/^\/guide(\/|$)/, "手册"],
  [/^\/schedule(\/|$)/, "赛程"],
  [/^\/mappool(\/|$)/, "图池"],
  [/^\/tools(\/|$)/, "工具"],
  [/^\/registrations(\/|$)/, "选手"],
  [/^\/photos(\/|$)/, "历届"],
  [/^\/contact(\/|$)/, "联系我们"],
  [/^\/register(\/|$)/, "报名"],
  [/^\/bind(\/|$)/, "绑定"],
  [/^\/player-info(\/|$)/, "个人中心"],
];

function titleFor(pathname: string): string {
  for (const [pattern, title] of PAGE_TITLES) {
    if (pattern.test(pathname)) return title;
  }
  return "404";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Stage = "idle" | "sweep";

type Displayed = {
  /** 当前上屏的内容节点 */
  node: ReactNode;
  /** 该节点所属路由 */
  path: string;
  /** 幕布上展示的页面名 */
  title: string;
};

/**
 * 页面转场（Page Transition）。
 *
 * 路由切换时：全屏幕布自左向右连续横扫遮挡旧页面，幕布上以 800px 超大
 * 描边字（只留轮廓、不填充）平移展示下一个页面的名字；横扫过半、完全
 * 遮挡屏幕的瞬间切换内容，随后幕布直接扫出屏幕，中途不停顿。
 *
 * 路由变化在「渲染期」检测而非 effect 中检测：React 会在 commit 前用新状态
 * 重新渲染，新内容绝不会抢在幕布遮挡之前上屏，旧页面也不会被卸载重挂载。
 *
 * 用法：放在布局中原本 `<Outlet />` 的位置，无需子节点。
 */
export default function PageTransition() {
  const outlet = useOutlet();
  const { pathname } = useLocation();

  const [stage, setStage] = useState<Stage>("idle");
  const [displayed, setDisplayed] = useState<Displayed>({
    node: outlet,
    path: pathname,
    title: titleFor(pathname),
  });
  const [swapId, setSwapId] = useState(0);

  // ---- 渲染期处理路由变化（调用 setState 后 React 立即重渲染再 commit，中间结果不会上屏） ----
  if (displayed.path !== pathname) {
    const nextTitle = titleFor(pathname);
    if (prefersReducedMotion()) {
      // 减少动态效果：无幕布动画，直接切换内容
      setDisplayed({ node: outlet, path: pathname, title: nextTitle });
      setSwapId(swapId + 1);
    } else {
      // 冻结当前屏幕内容（旧页面实例保持挂载），幕布自左向右横扫。
      // displayed.path 变化会让幕布以 key 重挂载、动画从头播放，计时器同步重启
      setDisplayed({ node: displayed.node, path: pathname, title: nextTitle });
      setStage("sweep");
    }
  } else if (stage !== "sweep" && displayed.node !== outlet) {
    // 同步：非遮挡期间始终展示最新内容
    setDisplayed((d) => ({ ...d, node: outlet }));
  }

  // 内容真正切换上屏时，通知 ScrollToTop 等滚动复位
  useEffect(() => {
    window.dispatchEvent(new Event(PAGE_SWAP_EVENT));
  }, [swapId]);

  // 横扫计时器：过半（完全遮挡）→ 切换内容；扫出屏幕 → 复位。
  // 依赖 displayed.path：转场中再次导航时整体重新计时，闭包里的 outlet 始终是最新目标页面
  useEffect(() => {
    if (stage === "idle") return;
    // 幕布横扫至屏幕中央、完全遮挡：此刻才切换页面内容
    const swapTimer = window.setTimeout(() => {
      setDisplayed((d) => ({ ...d, node: outlet }));
      setSwapId((x) => x + 1);
    }, SWAP_MS);
    // 幕布扫出屏幕：复位
    const endTimer = window.setTimeout(() => setStage("idle"), TOTAL_MS);
    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(endTimer);
    };
  }, [stage, displayed.path]);

  return (
    <>
      {displayed.node}
      {stage !== "idle" && (
        <div
          key={displayed.path}
          aria-hidden="true"
          className="page-transition-curtain page-transition-curtain--sweep paper-texture"
        >
          <div className="page-transition-title page-transition-title--sweep">
            {displayed.title}
          </div>
        </div>
      )}
    </>
  );
}
