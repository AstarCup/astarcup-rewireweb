/**
 * 开发环境元素标记（仅 npm run dev 生效，生产构建会被 tree-shake 掉）。
 *
 * 用法：
 *   - 页面加载后按 `d` 键（或 Escape）开关标记
 *   - URL 带 `?dbg=1` 启动时直接开启（方便 headless 调试）
 *   - 标记格式：`页面-组件-序号`，例如 `home-PaperStack-2`、`news-NewsPage-1`
 *   - 鼠标悬停任意元素显示它的 id；点击元素把 id 复制到剪贴板（同时阻止误触）
 *   - 右下角 HUD 显示当前页面、开关状态与最近复制的 id
 *
 * 实现说明：通过 React 在 DOM 上挂的 `__reactFiber$*` 向上回溯，取最近的
 * 具名组件作为「组件」名；组件实例的根 DOM 节点（父节点的最近组件不同处）
 * 打 `data-did` 属性，常驻标签只显示非原子组件（Badge/Button 等仍可悬停取 id）。
 */

const ATTR = "data-did";
const OVERLAY_ATTR = "data-debug-overlay";

/** 常驻标签不显示的原子组件（太碎，悬停仍可取 id） */
const ATOM_EXACT = new Set([
  "Badge",
  "Button",
  "Input",
  "Textarea",
  "Checkbox",
  "Radio",
  "Label",
  "Separator",
  "Avatar",
  "Spinner",
  "LoadingBlock",
  "ErrorBlock",
  "Link",
  "NavLink",
]);
const ATOM_PREFIX = [
  "Primitive",
  "Dialog",
  "Select",
  "Dropdown",
  "Popover",
  "Tooltip",
  "ContextMenu",
  "HoverCard",
  "Command",
  "Toast",
  "Scroll",
];

/** React/路由骨架组件，不算「组件」 */
const SKIP = new Set([
  "RenderedRoute",
  "Route",
  "Routes",
  "Fragment",
  "ContextProvider",
  "Provider",
  "StrictMode",
  "Suspense",
  "Outlet",
  "Memo",
  "ForwardRef",
]);

const TAG_SKIP = new Set([
  "SCRIPT",
  "STYLE",
  "META",
  "LINK",
  "TITLE",
  "NOSCRIPT",
  "HEAD",
  "HTML",
]);

let installed = false;
let active = false;
let overlay: HTMLDivElement | null = null;
let tooltip: HTMLDivElement | null = null;
let highlight: HTMLDivElement | null = null;
let hud: HTMLDivElement | null = null;
let hudStatus: HTMLElement | null = null;
let hudLast: HTMLElement | null = null;
let observer: MutationObserver | null = null;
let rebuildTimer: number | null = null;

// ============ 基础工具 ============

function pageId(): string {
  const p = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (!p) return "home";
  return p.split("/")[0];
}

function fiberOf(el: Element): any | null {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  return key ? (el as any)[key] : null;
}

function typeName(t: any): string | null {
  if (typeof t === "function") return t.displayName || t.name || null;
  if (t && typeof t === "object") {
    return (
      t.displayName ||
      t.name ||
      (t.render && (t.render.displayName || t.render.name)) ||
      null
    );
  }
  return null;
}

/** 该 DOM 节点最近的具名 React 组件（跳过路由骨架） */
/** 该 DOM 节点最近的具名 React 组件 fiber（跳过路由骨架） */
function nearestNamedFiber(el: Element): any | null {
  let fiber = fiberOf(el);
  while (fiber) {
    const n = typeName(fiber.type);
    if (n && !SKIP.has(n) && !n.startsWith("Debug")) return fiber;
    fiber = fiber.return;
  }
  return null;
}

function isAtom(name: string): boolean {
  if (ATOM_EXACT.has(name)) return true;
  return ATOM_PREFIX.some((p) => name.startsWith(p));
}

/** id 片段只保留 字母/数字/下划线（Radix 的 displayName 可能带点号，如 Primitive.ol） */
function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable === true
  );
}

function inOverlay(node: EventTarget | null): boolean {
  const el = node as Element | null;
  return !!el && typeof el.closest === "function" && !!el.closest(`[${OVERLAY_ATTR}]`);
}

// ============ 标记构建 ============

function makeOverlayChild(style: string, z: string): HTMLDivElement {
  const d = document.createElement("div");
  d.setAttribute(OVERLAY_ATTR, "");
  d.style.cssText = `position:fixed;pointer-events:none;z-index:${z};${style}`;
  (overlay as HTMLDivElement).appendChild(d);
  return d;
}

function clearMarkers() {
  document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.removeAttribute(ATTR));
  if (overlay) overlay.remove();
  overlay = null;
  tooltip = null;
  highlight = null;
  hud = null;
  hudStatus = null;
  hudLast = null;
}

function buildHud() {
  overlay = document.createElement("div");
  overlay.setAttribute(OVERLAY_ATTR, "");
  overlay.style.cssText =
    "position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483000";
  document.body.appendChild(overlay);

  highlight = makeOverlayChild(
    "display:none;border:2px solid #e85d75;border-radius:4px;background:rgba(232,93,117,0.08);",
    "2147483001",
  );
  tooltip = makeOverlayChild(
    "display:none;background:#1a1a1a;color:#fff;font:600 11px/1.6 ui-monospace,monospace;" +
      "padding:2px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);",
    "2147483002",
  );

  hud = makeOverlayChild(
    "right:12px;bottom:12px;background:#1a1a1a;color:#fdf6ee;font:600 11px/1.7 ui-monospace,monospace;" +
      "padding:8px 12px;border-radius:10px;pointer-events:auto;box-shadow:0 4px 16px rgba(0,0,0,.4);" +
      "max-width:340px;border:1px solid rgba(255,255,255,.15);",
    "2147483003",
  );
  hud.style.pointerEvents = "auto";

  const title = document.createElement("div");
  title.textContent = `元素标记 [开] · ${pageId()}`;
  title.style.color = "#f5c040";
  hud.appendChild(title);

  hudStatus = document.createElement("div");
  hudStatus.textContent = "悬停查看 id · 点击复制 · d/ESC 关闭";
  hudStatus.style.opacity = "0.75";
  hud.appendChild(hudStatus);

  hudLast = document.createElement("div");
  hudLast.style.opacity = "0.9";
  hudLast.style.color = "#8fe3d0";
  hud.appendChild(hudLast);
}

function addLabel(id: string, rect: DOMRect) {
  const s = document.createElement("span");
  s.textContent = id;
  s.style.cssText =
    `position:absolute;left:${rect.left + window.scrollX}px;` +
    `top:${rect.top + window.scrollY - 2}px;transform:translateY(-100%);` +
    "background:rgba(245,192,64,.95);color:#1a1a1a;border:1px solid rgba(0,0,0,.3);" +
    "font:700 9px/14px ui-monospace,monospace;padding:0 4px;border-radius:3px;" +
    "white-space:nowrap;pointer-events:none;box-shadow:1px 1px 0 rgba(0,0,0,.2);";
  (overlay as HTMLDivElement).appendChild(s);
}

function rebuild() {
  if (!active || !document.body) return;
  observer?.disconnect();
  clearMarkers();
  buildHud();

  const page = pageId();
  const overlaySel = `[${OVERLAY_ATTR}]`;

  const nodes: Element[] = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (TAG_SKIP.has(el.tagName)) continue;
    if (el.closest(overlaySel)) continue;
    nodes.push(el);
  }

  // 每个元素最近的具名组件 fiber（只算一次，父节点比较复用）
  const namedFiber = new Map<Element, any | null>();
  for (const el of nodes) namedFiber.set(el, nearestNamedFiber(el));

  // 第一遍：找组件实例根节点（最近组件与父节点不同；比较 fiber 对象，支持同名组件嵌套）
  const instanceIdOf = new Map<Element, string>();
  const instanceCounters = new Map<string, number>();
  for (const el of nodes) {
    const f = namedFiber.get(el);
    if (!f) continue;
    const parent = el.parentElement;
    const pf = (parent && namedFiber.get(parent)) || null;
    if (f === pf) continue; // 不是组件实例的根节点

    const raw = typeName(f.type) || "El";
    const name = safeName(raw);
    const idx = (instanceCounters.get(name) ?? 0) + 1;
    instanceCounters.set(name, idx);
    const instanceId = `${page}-${name}-${idx}`;
    instanceIdOf.set(el, instanceId);

    // 常驻标签只给非原子组件且可见的元素
    if (!isAtom(raw) && el.getClientRects().length > 0) {
      const rect = el.getBoundingClientRect();
      if (rect.width >= 40 && rect.height >= 16) addLabel(instanceId, rect);
    }
  }

  // 第二遍：每个元素都打 data-did —— 组件内元素用 实例.序号（如 home-PaperStack-3.12）
  const elemCounters = new Map<string, number>();
  const tagCounters = new Map<string, number>();
  for (const el of nodes) {
    let root: Element | null = el;
    while (root && !instanceIdOf.has(root)) root = root.parentElement;
    if (root) {
      const iid = instanceIdOf.get(root) as string;
      const n = elemCounters.get(iid) ?? 0;
      elemCounters.set(iid, n + 1);
      el.setAttribute(ATTR, n === 0 ? iid : `${iid}.${n}`);
    } else {
      // 不在任何组件下（如 #root 本身）：用标签名兑底
      const tag = safeName(el.tagName.toLowerCase());
      const n = (tagCounters.get(tag) ?? 0) + 1;
      tagCounters.set(tag, n);
      el.setAttribute(ATTR, `${page}-${tag}-${n}`);
    }
  }

  if (observer) observer.observe(document.body, { childList: true, subtree: true });
}

function scheduleRebuild() {
  if (!active) return;
  if (rebuildTimer !== null) window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => {
    rebuildTimer = null;
    rebuild();
  }, 250);
}

// ============ 交互 ============

function idOf(target: EventTarget | null): string | null {
  const el = target as Element | null;
  if (!el || typeof el.closest !== "function") return null;
  const holder = el.closest(`[${ATTR}]`);
  return holder ? holder.getAttribute(ATTR) : null;
}

function showHover(id: string | null, x: number, y: number) {
  if (!tooltip || !highlight) return;
  if (!id) {
    tooltip.style.display = "none";
    highlight.style.display = "none";
    return;
  }
  tooltip.textContent = id;
  tooltip.style.display = "block";
  tooltip.style.left = `${Math.min(x + 14, window.innerWidth - 260)}px`;
  tooltip.style.top = `${Math.min(y + 18, window.innerHeight - 40)}px`;

  const el = document.querySelector(`[${ATTR}="${CSS.escape(id)}"]`);
  if (el) {
    const r = el.getBoundingClientRect();
    highlight.style.display = "block";
    highlight.style.left = `${r.left - 2}px`;
    highlight.style.top = `${r.top - 2}px`;
    highlight.style.width = `${r.width + 4}px`;
    highlight.style.height = `${r.height + 4}px`;
  } else {
    highlight.style.display = "none";
  }
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* ignore */
  }
  ta.remove();
}

function onmousemove(e: MouseEvent) {
  if (!active || inOverlay(e.target)) return;
  showHover(idOf(e.target), e.clientX, e.clientY);
}

function onClick(e: MouseEvent) {
  if (!active || inOverlay(e.target)) return;
  const id = idOf(e.target);
  if (!id) return;
  e.preventDefault();
  e.stopPropagation();
  void copyText(id);
  if (hudLast) hudLast.textContent = `已复制：${id}`;
  if (tooltip) {
    tooltip.textContent = `已复制 ${id}`;
    tooltip.style.display = "block";
  }
}

function onKey(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === "d" && !isEditable(e.target)) {
    e.preventDefault();
    toggle();
  } else if (key === "escape" && active) {
    e.preventDefault();
    disable();
  }
}

// ============ 开关 ============

function enable() {
  if (active || !document.body) return;
  active = true;
  rebuild();
  observer = new MutationObserver((muts) => {
    const fromUs = muts.every((m) => {
      const t = m.target as Element | null;
      return !!t && typeof t.closest === "function" && !!t.closest(`[${OVERLAY_ATTR}]`);
    });
    if (!fromUs) scheduleRebuild();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("mousemove", onmousemove, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("resize", scheduleRebuild);
}

function disable() {
  if (!active) return;
  active = false;
  observer?.disconnect();
  observer = null;
  if (rebuildTimer !== null) {
    window.clearTimeout(rebuildTimer);
    rebuildTimer = null;
  }
  window.removeEventListener("mousemove", onmousemove, true);
  window.removeEventListener("click", onClick, true);
  window.removeEventListener("resize", scheduleRebuild);
  clearMarkers();
}

function toggle() {
  if (active) disable();
  else enable();
}

/** 在 main.tsx 中调用；生产环境是 no-op。 */
export function installDebugMarkers() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("keydown", onKey, true);
  if (new URLSearchParams(window.location.search).has("dbg")) {
    // React 渲染完成后再打标记
    window.setTimeout(enable, 300);
  }
}
