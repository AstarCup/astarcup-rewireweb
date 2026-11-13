import { getDifficultyColor } from "@/lib/difficultyColor";
import { modBase } from "@/lib/mods";
import { site } from "@/lib/site";
import { MODS_ORDER } from "@/lib/types";
import type { MapSelection } from "@/lib/types";

export function starColor(s: number | null): string {
  return getDifficultyColor(s ?? 0);
}

export function fmtLength(seconds: number | null): string {
  if (seconds == null) return "-";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function osuMapUrl(s: MapSelection): string {
  if (s.url) return s.url;
  return site.urls.osuBeatmapShort(s.beatmapId);
}

export function sayobotUrl(s: MapSelection): string {
  return site.urls.sayobot(s.beatmapsetId ?? s.beatmapId);
}

/** 按 MOD 分组并按 MOD / MOD 位排序 */
export function groupMaps(list: MapSelection[]): { mod: string; items: MapSelection[] }[] {
  const map = new Map<string, MapSelection[]>();
  for (const m of list) {
    const key = modBase(m);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  const order = MODS_ORDER as readonly string[];
  const keys = Array.from(map.keys()).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return keys.map((mod) => ({
    mod,
    items: map
      .get(mod)!
      .slice()
      .sort((a, b) => {
        const pa = Number(a.modPosition ?? 0);
        const pb = Number(b.modPosition ?? 0);
        if (pa !== pb) return pa - pb;
        return (a.selectedAt ?? a.createdAt ?? "").localeCompare(b.selectedAt ?? b.createdAt ?? "");
      }),
  }));
}
