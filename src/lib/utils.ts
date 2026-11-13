import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { site } from "@/lib/site";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** osu! 头像：统一用 osuId 生成（username 版 URL 遇空格会失效），avatarUrl 缺失时兜底 */
export function osuAvatarUrl(osuId?: string | number | null): string | undefined {
  if (osuId === null || osuId === undefined || osuId === "") return undefined;
  return site.urls.osuAvatar(osuId);
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

const WALL_CLOCK_FORMAT = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 后端将本地(+8)墙钟时间按 UTC 序列化(+00:00)，此处按 +08:00 墙钟解析，避免偏移 8 小时 */
export function formatWallClock(iso?: string | null): string {
  if (!iso) return "-";
  const naive = iso.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const d = new Date(`${naive}+08:00`);
  if (Number.isNaN(d.getTime())) return "-";
  // 用 formatToParts 取值，不依赖 toLocaleString 的分隔符 / 空格形式
  const parts = WALL_CLOCK_FORMAT.formatToParts(d);
  const get = (type: "year" | "month" | "day" | "hour" | "minute") =>
    parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  // 某些引擎午夜会输出 24 时
  if (hour === "24") hour = "00";
  const minute = get("minute").padStart(2, "0");
  return `${year}年${month}月${day}日 ${hour.padStart(2, "0")}:${minute}`;
}

const PLATFORM_LABELS: Record<string, string> = {
  aiocqhttp: "QQ",
  qq_official: "QQ 官方",
  telegram: "Telegram",
};

/** `platform` 可能形如 `qq_official:123456`，这里只取适配器名做展示。 */
export function platformLabel(platform: string): string {
  const base = platform.split(":")[0];
  return PLATFORM_LABELS[base] ?? platform;
}

/** 平台账号展示：QQ 号直接显示，openid 只显示前后几位。 */
export function platformUserLabel(platform: string, userId: string): string {
  const base = platform.split(":")[0];
  if (base === "aiocqhttp") return `QQ ${userId}`;
  if (base === "qq_official") {
    const short = userId.length > 16 ? `${userId.slice(0, 8)}…${userId.slice(-6)}` : userId;
    return `QQ 官方账号（openid: ${short}）`;
  }
  return userId;
}
