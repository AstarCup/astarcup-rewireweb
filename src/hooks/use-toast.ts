import type { ReactNode } from "react";
import { toast as toastManager } from "@/components/ui/toast";

export type ToastVariant = "default" | "destructive";

export interface ToastOptions {
  title?: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
}

/**
 * 统一入口：所有 toast 都走 Base UI 的 toast manager（渲染在屏幕正中偏下的 Toaster）。
 * variant=destructive 映射为 error 类型（红色图标）。
 * 默认 3.5 秒后自动关闭（鼠标悬停时会暂停计时）。
 */
export function toast({ title, description, variant }: ToastOptions) {
  toastManager.add({
    title,
    description,
    type: variant === "destructive" ? "error" : "success",
    timeout: 3500,
  });
}
