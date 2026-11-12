import { useEffect, useRef } from "react";
import gsap from "gsap";
import CursorSvg from "@/components/effects/CursorSvg";

/**
 * osu!lazer 风格自定义光标 + 可点击元素吸附框。
 *
 * 参考 osu-lazer-style-cursor：
 * - 跟随鼠标（fixed + translate3d，热区在箭头尖）；
 * - 悬停可点击元素时倾斜 24.3°，按下缩小到 0.9 并在内部填充渐变上高亮；
 * - 按住拖动超过 30px 时，光标朝向拖动方向旋转，松手弹回；
 * - 全站替换系统光标（输入框也是自定义光标），
 *   确实需要系统光标的地方可以加 `data-cursor="native"`。
 *
 * 指到可点击元素时出现渐变描边框：从光标处展开吸附到元素外框；
 * 在元素间移动时框直接滑过去，空白处有 600ms 宽限期。
 *
 * 触屏设备不启用；启用时给 <html> 加 `.osu-cursor-on` 隐藏系统光标。
 */
const INTERACTIVE_SELECTOR = [
  "a",
  "area",
  "button",
  "summary",
  "label[for]",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='menuitemcheckbox']",
  "[role='menuitemradio']",
  "[role='option']",
  "[role='tab']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[data-cursor='pointer']",
].join(",");

/** 手动声明要用系统光标的元素（默认全站都用自定义光标） */
const NATIVE_SELECTOR = "[data-cursor='native']";

/** 指示框动画时长 / 空白处宽限期 */
const FRAME_DURATION = 0.4;
const FRAME_GRACE_MS = 600;

type CursorKind = "pointer" | "normal" | "native";

function classify(target: EventTarget | null): CursorKind {
  if (!(target instanceof Element)) return "normal";
  if (target.closest(NATIVE_SELECTOR)) return "native";
  // 禁用状态不当作可点击
  if (target.closest("button:disabled, [aria-disabled='true']")) return "normal";
  if (target.closest(INTERACTIVE_SELECTOR)) return "pointer";
  return "normal";
}

export default function OsuCursor({ enabled = true }: { enabled?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rotateRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const root = rootRef.current;
    const rotate = rotateRef.current;
    const scale = scaleRef.current;
    const frame = frameRef.current;
    if (!root || !rotate || !scale || !frame) return;

    let visible = false;
    let pressed = false;
    let rotating = false;
    let hoverMode: CursorKind = "normal";
    let degrees = 0;
    let dragStart = { x: 0, y: 0 };
    let frameVisible = false;
    let frameTarget: Element | null = null;
    let hideTimer = 0;
    const cursorPos = { x: -100, y: -100 };

    const cancelHide = () => {
      if (!hideTimer) return;
      clearTimeout(hideTimer);
      hideTimer = 0;
    };

    /** 移到空白处先别急着收，留个宽限期：期间进入下一个可点击元素就让框滑过去 */
    const scheduleHideFrame = () => {
      cancelHide();
      hideTimer = window.setTimeout(() => {
        hideTimer = 0;
        hideFrame();
      }, FRAME_GRACE_MS);
    };

    const showFrame = (el: Element) => {
      if (frameVisible && frameTarget === el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const wasVisible = frameVisible;
      frameVisible = true;
      frameTarget = el;
      cancelHide();
      // 跟随目标自身的圆角（胶囊按钮就画成胶囊）
      const radius = window.getComputedStyle(el).borderRadius;
      const targetRadius = radius && radius !== "0px" ? radius : "14px";

      const target = {
        x: rect.left - 8,
        y: rect.top - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        opacity: 1,
        borderRadius: targetRadius,
        overwrite: "auto" as const,
      };

      if (wasVisible) {
        // 框已经在别的元素上：直接滑到下一个可点击元素
        gsap.to(frame, { ...target, duration: FRAME_DURATION, ease: "power3.out" });
        return;
      }

      // 首次出现：从光标处展开吸附到元素外框
      gsap.fromTo(
        frame,
        {
          x: cursorPos.x - 4,
          y: cursorPos.y - 4,
          width: 28,
          height: 28,
          opacity: 0,
          borderRadius: "50%",
        },
        { ...target, duration: FRAME_DURATION, ease: "power3.out" },
      );
    };

    const hideFrame = () => {
      if (!frameVisible) return;
      frameVisible = false;
      frameTarget = null;
      cancelHide();
      gsap.to(frame, { opacity: 0, duration: 0.18, overwrite: "auto" });
    };

    const show = () => {
      if (visible) return;
      visible = true;
      root.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`;
      root.style.display = "block";
      document.documentElement.classList.add("osu-cursor-on");
    };

    const endPress = () => {
      if (!pressed && !rotating) return;
      if (rotating) {
        const duration = 600 * (1 + Math.abs(degrees / 720));
        rotate.style.transition = `transform ${Math.round(duration)}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        rotate.style.transform = `rotate(${hoverMode === "pointer" ? 24.3 : 0}deg)`;
      }
      pressed = false;
      rotating = false;
      degrees = 0;
      root.classList.remove("is-down");
      scale.style.transition = "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)";
      scale.style.transform = "scale(1)";
    };

    const hide = () => {
      if (!visible) {
        endPress();
        return;
      }
      visible = false;
      root.style.display = "none";
      document.documentElement.classList.remove("osu-cursor-on");
      hoverMode = "normal";
      rotate.style.transition = "none";
      rotate.style.transform = "rotate(0deg)";
      hideFrame();
      endPress();
    };

    const setHoverMode = (kind: CursorKind) => {
      // 同一状态不重复写样式（避免每次 mouseover 都触发样式计算）
      if (kind === hoverMode && !rotating) return;
      hoverMode = kind;
      if (rotating) return;
      rotate.style.transition = "transform 150ms ease-out";
      rotate.style.transform = kind === "pointer" ? "rotate(24.3deg)" : "rotate(0deg)";
    };

    /** 同步写位置：不排队到下一帧，避免 1 帧以上的跟随延迟 */
    const moveTo = (x: number, y: number) => {
      cursorPos.x = x;
      cursorPos.y = y;
      if (!visible) {
        // 还没触发过 mouseover（比如页面刚加载、鼠标已在页面内）时，第一次移动就直接显示
        if (!(document.elementFromPoint(x, y)?.closest(NATIVE_SELECTOR) ?? false)) show();
        if (!visible) return;
      }
      root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!pressed) return;

      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      if (!rotating) {
        if (dx * dx + dy * dy <= 30 * 30) return;
        rotating = true;
      }
      const target = (Math.atan2(-dx, dy) * 180) / Math.PI + 24.3;
      let diff = (target - degrees) % 360;
      if (diff < -180) diff += 360;
      if (diff > 180) diff -= 360;
      degrees += diff;
      rotate.style.transition = "transform 150ms";
      rotate.style.transform = `rotate(${degrees}deg)`;
    };

    const onPointerMove = (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerType && pe.pointerType !== "mouse") return;
      moveTo(pe.clientX, pe.clientY);
    };

    const onMouseOver = (e: MouseEvent) => {
      const kind = classify(e.target);
      if (kind === "native") {
        hide();
        return;
      }
      show();
      setHoverMode(kind);
      if (kind === "pointer" && e.target instanceof Element) {
        const el = e.target.closest(INTERACTIVE_SELECTOR) ?? e.target;
        showFrame(el);
      } else {
        scheduleHideFrame();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!visible) return;
      pressed = true;
      rotating = false;
      degrees = 0;
      dragStart = { x: e.clientX, y: e.clientY };
      root.classList.add("is-down");
      scale.style.transition = "transform 800ms cubic-bezier(0.33, 1, 0.68, 1)";
      scale.style.transform = "scale(0.9)";
    };

    const onMouseUp = () => endPress();
    const onWindowLeave = () => hide();
    const onDragStart = () => hide();

    // 页面滚动时让框跟着目标走
    const onScroll = () => {
      if (!frameVisible || !frameTarget) return;
      const rect = frameTarget.getBoundingClientRect();
      gsap.to(frame, {
        x: rect.left - 8,
        y: rect.top - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        duration: 0.25,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    // pointerrawupdate 在 Chrome 里比 mousemove 更早触发，跟手更好
    const supportsRawUpdate = "onpointerrawupdate" in window;
    document.addEventListener(supportsRawUpdate ? "pointerrawupdate" : "mousemove", onPointerMove, {
      passive: true,
    });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mousedown", onMouseDown, { passive: true });
    document.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("mouseleave", onWindowLeave, { passive: true });
    document.addEventListener("dragstart", onDragStart, { passive: true });
    window.addEventListener("blur", onWindowLeave);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      gsap.killTweensOf(frame);
      document.removeEventListener(
        supportsRawUpdate ? "pointerrawupdate" : "mousemove",
        onPointerMove,
      );
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onWindowLeave);
      document.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("blur", onWindowLeave);
      window.removeEventListener("scroll", onScroll, { capture: true });
      // 关闭开关时同时收起光标和指示框，并恢复系统光标
      document.documentElement.classList.remove("osu-cursor-on");
      root.style.display = "none";
      frame.style.opacity = "0";
    };
  }, [enabled]);

  return (
    <>
      <div ref={frameRef} className="osu-frame" aria-hidden="true" />
      <div ref={rootRef} className="osu-cursor" aria-hidden="true">
        <div ref={rotateRef} className="osu-cursor-rotate">
          <div ref={scaleRef} className="osu-cursor-scale">
            <CursorSvg />
          </div>
        </div>
      </div>
    </>
  );
}
