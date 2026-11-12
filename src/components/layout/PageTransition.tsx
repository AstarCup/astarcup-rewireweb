import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { gsap } from "gsap";
import Logo from "@/components/layout/Logo";

/** 页面内容真正切换上屏的那一刻派发（ScrollToTop 等在此时才滚动，避免旧页面提前跳动） */
export const PAGE_SWAP_EVENT = "astarcup:page-swap";

/** 单层横扫时长（秒） */
const SWEEP_DURATION = 0.7;
/** 相邻颜色层的错位间隔（秒）：暗 → 青 → 黄 → 主色 → 背景依次入场 */
const LAYER_STAGGER = 0.05;
/** 最上层（--background，含超大字）最后入场 */
const MAIN_DELAY = LAYER_STAGGER * 4;
/** 内容切换点：最上层行至中点、最深遮挡视口的瞬间 */
const SWAP_AT = MAIN_DELAY + SWEEP_DURATION / 2;
/** 标题相对幕布的视差漂移幅度（相对视口宽度的比例） */
const TITLE_DRIFT = 0.2;

/** 每层宽度（vw，需与 index.css 保持一致）：宽于视口，保证主幕布中点恰好完全遮挡 */
const LAYER_WIDTH_VW = 220;
/** 横扫起止点，单位为层自身宽度的百分比：屏外左侧 → 屏外右侧 */
const X_START = -100;
const X_END = (100 / LAYER_WIDTH_VW) * 100;

/** 首屏 loading 最短展示时长（ms），避免一闪而过 */
const BOOT_MIN_MS = 1200;
/** 网络卡死的兜底时长（ms）：正常情况下等待真实资源加载完成 */
const BOOT_MAX_MS = 15000;
/** 进度条补满到转场揭幕的间隔（ms，与 boot-loading.css 中进度条过渡时长一致） */
const BOOT_REVEAL_DELAY = 400;

/** 首屏 loading 在整个应用生命周期内只展示一次 */
let bootShown = false;

/** 等待页面资源就绪：window load（脚本/样式）+ 字体 */
function whenResourcesReady(): Promise<void> {
  const waits: Array<Promise<unknown>> = [
    new Promise((resolve) => {
      if (document.readyState === "complete") resolve(null);
      else window.addEventListener("load", () => resolve(null), { once: true });
    }),
  ];
  if (document.fonts?.ready) waits.push(document.fonts.ready);
  return Promise.all(waits).then(() => {});
}

/** 首屏真实加载追踪的资源：按字节统计进度（banner.png 等大图） */
type BootAsset = { loaded: number; total: number };

/** 图片内存缓存：原始 URL → blob URL。SPA 生命周期内保留，页面回访免重复下载大图 */
const imageCache = new Map<string, string>();

/** 把内存缓存里的图片写回 <img>：切换页面回来时 banner.png 等大图无需重新加载 */
function patchImagesWithCache(): void {
  for (const img of Array.from(document.images)) {
    const cached = imageCache.get(img.src);
    if (!cached || img.src === cached) continue;
    const original = img.src;
    // 写回失败时回退原始地址，保证图片一定能显示
    img.onerror = () => {
      img.onerror = null;
      img.src = original;
    };
    img.src = cached;
  }
}

/** 收集当前页面 DOM 中需要真实加载的图片（跳过懒加载与 data: 占位图） */
function collectBootImages(): HTMLImageElement[] {
  return Array.from(document.images).filter(
    (img) => img.loading !== "lazy" && !!img.src && !img.src.startsWith("data:"),
  );
}

/** 从扩展名粗略推断 MIME（响应缺 content-type 时的回退） */
function mimeFromUrl(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "avif":
      return "image/avif";
    default:
      return "";
  }
}

/**
 * 流式读取图片并统计真实字节进度；读取完成后把 blob 写回 <img>，
 * 页面只下载一次，进度条反映的就是这张图的真实加载进度。
 */
async function loadImageWithProgress(
  img: HTMLImageElement,
  asset: BootAsset,
  onProgress: () => void,
): Promise<void> {
  const url = img.src;
  try {
    const res = await fetch(url);
    const size = Number(res.headers.get("content-length")) || 0;
    const reader = res.body?.getReader();
    if (!reader) {
      asset.total = asset.loaded = size || 1;
      onProgress();
      return;
    }
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      asset.loaded = loaded;
      asset.total = size || loaded;
      onProgress();
    }
    // 已完整读取：合并字节块并以 blob 写回 <img>，避免与 <img> 自身的请求重复下载
    const merged = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    // MIME 必须保留：SVG 等类型在 <img> 中渲染要求 blob 带正确类型，缺失会解码失败只剩 alt 文本
    const type = res.headers.get("content-type")?.split(";")[0].trim() || mimeFromUrl(url);
    const blobUrl = URL.createObjectURL(new Blob([merged], { type: type || undefined }));
    // 进入内存缓存并常驻（SPA 生命周期内复用：切换页面回来免重复下载）
    imageCache.set(url, blobUrl);
    if (img.isConnected && img.src === url) {
      // 写回失败时回退原始地址，保证图片一定能显示
      img.onerror = () => {
        img.onerror = null;
        img.src = url;
      };
      img.src = blobUrl;
    }
    asset.total = asset.loaded = asset.total || loaded;
    onProgress();
  } catch {
    // 单个资源失败不阻塞揭幕
    asset.total = asset.loaded = asset.total || 1;
    onProgress();
  }
}

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
 * 页面转场（Page Transition，GSAP 驱动）。
 *
 * 首屏打开时先展示简约 loading（logo + 进度条），进度条按真实字节进度追踪
 * 当前页面的大图（如首页 12MB 的 banner.png）；全部资源就绪后，同样由转场
 * 动画揭幕（幕布完全遮挡的瞬间移除 loading）。
 *
 * 路由切换时：暗/青/黄/主色四层色彩错位先行、最上层 --background 随后，
 * 自左向右连续横扫遮挡旧页面；最上层以 800px 超大描边字（只留轮廓、不填充，
 * 描边取字体色 --foreground）平移展示下一个页面的名字，亮/暗色模式自动适配。
 * 最上层行至中点、完全遮挡屏幕的瞬间切换内容，随后各层继续错位扫出屏幕，
 * 中途不停顿。
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

  // ---- 首屏 loading ----
  const [booting, setBooting] = useState(() => !bootShown);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootDone, setBootDone] = useState(false);

  const shadowRef = useRef<HTMLDivElement>(null);
  const tealRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // 内容真正切换上屏时：把内存缓存里的图片写回新页面（回访免重复下载），并通知 ScrollToTop 滚动复位
  useEffect(() => {
    patchImagesWithCache();
    window.dispatchEvent(new Event(PAGE_SWAP_EVENT));
  }, [swapId]);

  // 首屏 loading：按真实字节进度追踪当前页面的大图（如首页 12MB 的 banner.png），
  // 并等待字体与 window load，保证最短展示时长
  useEffect(() => {
    if (!booting) return;
    bootShown = true;
    let finished = false;
    let revealTimer: number | undefined;
    let rafId = 0;
    const startedAt = performance.now();

    // ---- 真实加载进度（按字节汇总） ----
    const assets: BootAsset[] = [];
    const flush = () => {
      rafId = 0;
      const total = assets.reduce((s, a) => s + a.total, 0);
      const loaded = assets.reduce((s, a) => s + a.loaded, 0);
      const pct = total > 0 ? (loaded / total) * 100 : 100;
      // 不回退；揭幕前封顶 99%，100% 留给全部就绪的那一刻
      setBootProgress((p) => Math.min(Math.max(p, pct), 99));
    };
    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(flush);
    };

    const loads: Array<Promise<void>> = [];
    for (const img of collectBootImages()) {
      // 已加载完成的资源直接计入，不重复下载
      if (img.complete && img.naturalWidth > 0) continue;
      const asset: BootAsset = { loaded: 0, total: 0 };
      assets.push(asset);
      loads.push(loadImageWithProgress(img, asset, schedule));
    }
    if (assets.length === 0) schedule();

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallback);
      const remain = Math.max(0, BOOT_MIN_MS - (performance.now() - startedAt));
      revealTimer = window.setTimeout(() => setBootDone(true), remain);
    };
    const fallback = window.setTimeout(finish, BOOT_MAX_MS);
    Promise.all([...loads, whenResourcesReady()]).then(finish);

    return () => {
      finished = true;
      window.clearTimeout(fallback);
      window.clearTimeout(revealTimer);
      cancelAnimationFrame(rafId);
    };
  }, [booting]);

  // 资源就绪：进度条补满，随后由转场动画揭幕
  // （减少动态效果时跳过幕布动画，直接移除 loading）
  useEffect(() => {
    if (!bootDone) return;
    setBootProgress(100);
    const timer = window.setTimeout(() => {
      if (prefersReducedMotion()) {
        setBooting(false);
      } else {
        setStage("sweep");
      }
    }, BOOT_REVEAL_DELAY);
    return () => window.clearTimeout(timer);
  }, [bootDone]);

  // GSAP 横扫时间轴：各色层错位入场/扫出，主幕布过半完全遮挡时切换内容。
  // 依赖 displayed.path：转场中再次导航时销毁旧时间轴重新播放，闭包里的 outlet 始终是最新目标页面。
  // useLayoutEffect：首帧前即把各层定位到屏外，避免闪现。
  useLayoutEffect(() => {
    if (stage === "idle") return;
    const title = titleRef.current;
    if (!title) return;

    const drift = window.innerWidth * TITLE_DRIFT;
    const tl = gsap.timeline({
      onComplete: () => setStage("idle"),
    });

    // 各色层错位横扫：暗 → 青 → 黄 → 主色 → 背景（含标题），扇形叠层
    const sweeps: Array<[HTMLDivElement | null, number]> = [
      [shadowRef.current, 0],
      [tealRef.current, LAYER_STAGGER],
      [yellowRef.current, LAYER_STAGGER * 2],
      [curtainRef.current, LAYER_STAGGER * 3],
      [backgroundRef.current, MAIN_DELAY],
    ];
    for (const [layer, delay] of sweeps) {
      if (!layer) continue;
      tl.fromTo(
        layer,
        { xPercent: X_START },
        { xPercent: X_END, duration: SWEEP_DURATION, ease: "power2.inOut" },
        delay,
      );
    }

    // 标题相对最上层轻微前移，形成超大字平移的视差感
    tl.fromTo(
      title,
      { x: -drift },
      { x: drift, duration: SWEEP_DURATION, ease: "power2.inOut" },
      MAIN_DELAY,
    );

    // 最上层最深遮挡屏幕的瞬间：此刻才切换页面内容（其他层不参与遮挡判断）
    tl.call(
      () => {
        setDisplayed((d) => ({ ...d, node: outlet }));
        setSwapId((n) => n + 1);
        // 首屏 loading 在幕布完全遮挡时移除，随揭幕一起消失
        setBooting(false);
      },
      [],
      SWAP_AT,
    );

    return () => {
      tl.kill();
    };
  }, [stage, displayed.path]);

  // ---- 渲染期处理路由变化（调用 setState 后 React 立即重渲染再 commit，中间结果不会上屏） ----
  if (displayed.path !== pathname) {
    const nextTitle = titleFor(pathname);
    if (prefersReducedMotion()) {
      // 减少动态效果：无幕布动画，直接切换内容
      setDisplayed({ node: outlet, path: pathname, title: nextTitle });
      setSwapId(swapId + 1);
    } else {
      // 冻结当前屏幕内容（旧页面实例保持挂载），色层自左向右错位横扫
      setDisplayed({ node: displayed.node, path: pathname, title: nextTitle });
      setStage("sweep");
    }
  } else if (stage !== "sweep" && displayed.node !== outlet) {
    // 同步：非遮挡期间始终展示最新内容
    setDisplayed((d) => ({ ...d, node: outlet }));
  }

  return (
    <>
      {displayed.node}
      {booting && (
        <div className="boot-loading paper-texture">
          <div className="boot-loading__panel">
            <Logo full className="boot-loading__logo" />
            <div
              className="boot-loading__track"
              role="progressbar"
              aria-label="页面加载中"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(bootProgress)}
            >
              <div
                className="boot-loading__bar"
                style={{ width: `${bootProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {stage !== "idle" && (
        <div className="page-transition" aria-hidden="true">
          <div
            ref={shadowRef}
            className="page-transition-layer page-transition-layer--shadow"
          />
          <div
            ref={tealRef}
            className="page-transition-layer page-transition-layer--teal"
          />
          <div
            ref={yellowRef}
            className="page-transition-layer page-transition-layer--yellow"
          />
          <div
            ref={curtainRef}
            className="page-transition-layer page-transition-layer--primary"
          />
          <div
            ref={backgroundRef}
            className="page-transition-layer page-transition-layer--background paper-texture"
          >
            <div ref={titleRef} className="page-transition-title">
              {displayed.title}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
