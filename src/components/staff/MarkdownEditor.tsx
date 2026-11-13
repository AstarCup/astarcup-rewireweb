import { useEffect, useRef, useState } from "react";
import type VditorInstance from "vditor";
import "vditor/dist/index.css";
import { EMOJI_MAP } from "@/lib/emoji-data";
import EmojiPicker from "@/components/emoji/EmojiPicker";

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
 * - 表情：用 public/assets/szmEmoji 里生成的自定义表情包（见 scripts/gen-emoji.mjs），
 *   工具栏的 emoji 换成自己的选择器，插入 `:token:`；vditor 的 lute 用同一份映射渲染成图片
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
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("vditor").then(({ default: Vditor }) => {
      if (cancelled || !hostRef.current) return;
      // vditor 4.0 的类型里没有暴露 preview.customEmoji，但运行时支持（预览面板用）
      const previewExtra = { customEmoji: EMOJI_MAP } as unknown as IPreview;
      vdRef.current = new Vditor(hostRef.current, {
        cdn: "/vendor/vditor",
        value: initialRef.current,
        placeholder: placeholderRef.current ?? "",
        mode: "wysiwyg",
        cache: { enable: false },
        height: "100%",
        outline: { enable: false, position: "left" },
        // 自定义表情：lute 渲染 `:token:` 与输入 `:` 时的提示都用这份映射
        hint: { emoji: EMOJI_MAP },
        preview: previewExtra,
        // 默认工具栏，但把内置 emoji 面板换成我们自己的选择器
        toolbar: [
          {
            name: "szm-emoji",
            tip: "表情",
            icon: '<svg><use xlink:href="#vditor-icon-emoji"></use></svg>',
            click: () => setPickerOpen(true),
          },
          "headings",
          "bold",
          "italic",
          "strike",
          "link",
          "|",
          "list",
          "ordered-list",
          "check",
          "outdent",
          "indent",
          "|",
          "quote",
          "line",
          "code",
          "inline-code",
          "insert-before",
          "insert-after",
          "|",
          "upload",
          "record",
          "table",
          "|",
          "undo",
          "redo",
          "|",
          "fullscreen",
          "edit-mode",
          {
            name: "more",
            toolbar: [
              "both",
              "code-theme",
              "content-theme",
              "export",
              "outline",
              "preview",
              "devtools",
              "info",
              "help",
            ],
          },
        ],
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

  /** 在光标处插入 `:token: ` */
  const insertEmoji = (token: string) => {
    const vd = vdRef.current;
    if (!vd) return;
    vd.insertValue(`:${token}: `, true);
    vd.focus();
  };

  return (
    <>
      <div ref={hostRef} className={className ?? "h-full w-full"} />
      <EmojiPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={insertEmoji} />
    </>
  );
}
