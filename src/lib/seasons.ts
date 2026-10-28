import { useMemo } from "react";
import { useApp } from "@/lib/app-context";

export interface SeasonOption {
  value: string;
  label: string;
}

/**
 * 统一的赛季下拉选项：系统设置里定义的赛季（settings.availableSeasons）为主，
 * 再并上数据里实际出现过的赛季（避免历史数据赛季不在设置里时无法筛选）。
 */
export function useSeasonOptions(seen?: (string | null | undefined)[]): SeasonOption[] {
  const { settings } = useApp();
  // 用字符串做依赖键，避免调用方每次渲染传入新数组导致重复计算
  const key = (seen ?? [])
    .map((s) => (s ?? "").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(",");

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const s of settings?.availableSeasons ?? []) {
      map.set(s.value.toLowerCase(), s.label);
    }
    for (const s of key.split(",")) {
      if (s && !map.has(s)) map.set(s, s.toUpperCase());
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([value, label]) => ({ value, label }));
  }, [settings, key]);
}

/** 当前赛季（settings.current_season），没配置时回落到第一个赛季 */
export function useCurrentSeason(): string {
  const { settings } = useApp();
  return useMemo(() => {
    const cur = (settings?.current_season ?? "").trim().toLowerCase();
    if (cur) return cur;
    return (settings?.availableSeasons?.[0]?.value ?? "").toLowerCase();
  }, [settings]);
}
