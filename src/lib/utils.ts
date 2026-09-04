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

/** Standard Paper Craft button shadow tokens. */
export const hoverLift =
  "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5";