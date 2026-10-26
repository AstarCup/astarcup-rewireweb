import type { MapSelection } from "@/lib/types";

/** Mod 主色（与 Paper Craft 主题一致） */
export const MOD_COLORS: Record<string, string> = {
  NM: "#6b7fb5",
  HD: "#f5c040",
  HR: "#e85d75",
  DT: "#a78bfa",
  FM: "#5cb8a5",
  LZ: "#ec6ba8",
  TB: "#2d2d2d",
};

/** Mod 显示名 */
export const MOD_DISPLAY: Record<string, string> = {
  NM: "No Mod",
  HD: "Hidden",
  HR: "Hard Rock",
  DT: "Double Time",
  FM: "Free Mod",
  LZ: "Lazer Mod",
  TB: "Tiebreaker",
};

/** 取选图的主 Mod（如 "HD+HR" -> "HD"），默认 NM。 */
export function modBase(m: MapSelection): string {
  return (m.selectedMods ?? "NM").split("+")[0].toUpperCase() || "NM";
}
