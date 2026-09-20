import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number to 2 decimals, trimming trailing zeros. */
export function fmt(n: number | string | null | undefined, digits = 2): string {
  if (n === null || n === undefined || n === "") return "-";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "-";
  return parseFloat(num.toFixed(digits)).toString();
}

/** Format a unix count (e.g. combination/pp) to a locale string. */
export function fmtInt(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "0";
  const num = Number(n);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("zh-CN");
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
  });
}

/** 后端将本地(+8)墙钟时间按 UTC 序列化(+00:00)，此处按 +08:00 墙钟解析，避免偏移 8 小时 */
export function formatWallClock(iso?: string | null): string {
  if (!iso) return "-";
  const naive = iso.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const d = new Date(`${naive}+08:00`);
  if (Number.isNaN(d.getTime())) return "-";
  const s = d.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [datePart, timePart = ""] = s.split(" ");
  const [y, m, day] = datePart.split("/");
  return `${y}年${m}月${day}日 ${timePart}`;
}

/** Standard Paper Craft button shadow tokens. */
export const hoverLift =
  "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5";