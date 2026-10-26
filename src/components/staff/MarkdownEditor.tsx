import { useEffect, useRef } from "react";
import type VditorInstance from "vditor";
import "vditor/dist/index.css";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * vditor Markdown 编辑器（所见即所得）。
 * - 动态 import：只在打开弹窗时加载 vditor 主包
 * - cdn 指向 /vendor/vditor（vite.config.ts 的 vditorVendor 插件自托管），
 *   不走 unpkg CDN
 * - 组件只在挂载时创建一次；value 仅作为初始值（弹窗每次打开都会重新挂载）
 */
export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
}: MarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const vdRef = useRef<VditorInstance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialRef = useRef(value);
  const placeholderRef = useRef(placeholder);

  useEffect(() => {
    let cancelled = false;
    void import("vditor").then(({ default: Vditor }) => {
      if (cancelled || !hostRef.current) return;
      vdRef.current = new Vditor(hostRef.current, {
        cdn: "/vendor/vditor",
        value: initialRef.current,
        placeholder: placeholderRef.current ?? "",
        mode: "wysiwyg",
        cache: { enable: false },
        height: "100%",
        outline: { enable: false, position: "left" },
        input: (v: string) => onChangeRef.current(v),
      });
    });
    return () => {
      cancelled = true;
      try {
        vdRef.current?.destroy();
      } catch {
        /* vditor 卸载竞态时忽略 */
      }
      vdRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className={className ?? "h-full w-full"} />;
}
