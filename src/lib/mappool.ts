/**
 * 公开图池（MapSelection）→ 裁判房间 playlist 的 mod 配置。
 *
 * 图池里的 mod 是展示用的字符串（如 "HD+HR" / "FM" / "DT"），
 * 并可能带自定义 DT 倍率（customDTRate）与自定义 mod 名（customModName）。
 */
import type { MapSelection } from "@/lib/types";
import { DIFFICULTY_KEYS, expandModsText, type RefMod } from "@/lib/ref";

/** DT/HT 的倍率设置键（osu! API 的 mod settings） */
const SPEED_CHANGE_KEY = "speed_change";

/** 直接从图池条目推导 required / allowed mod */
export function poolMapMods(map: MapSelection): { required: RefMod[]; allowed: RefMod[] } {
  const tokens = (map.selectedMods ?? "NM")
    .split("+")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const required: RefMod[] = [];
  let freeMod = false;

  for (const token of tokens) {
    if (token === "NM" || token === "TB") continue;
    if (token === "FM") {
      freeMod = true;
      continue;
    }
    // LZ = 自定义 mod（名字另存 customModName），无法直接映射，交给裁判手填
    if (token === "LZ") continue;

    const rate = Number(map.customDTRate);
    if ((token === "DT" || token === "HT") && map.customDTRate != null && rate > 0) {
      required.push({ acronym: token, settings: { [SPEED_CHANGE_KEY]: rate } });
      continue;
    }
    required.push({ acronym: token });
  }

  return {
    required,
    allowed: freeMod ? expandModsText("FM", 0).allowed : [],
  };
}

/** RefMod[] → 可回填到输入框的文本（DT1.15 / DA[4,4,4,4] / HD） */
export function modsToText(mods: RefMod[]): string {
  return mods
    .map((mod) => {
      const settings = mod.settings ?? {};
      const keys = Object.keys(settings);
      if (keys.length === 0) return mod.acronym;

      if (
        (mod.acronym === "DT" || mod.acronym === "HT") &&
        typeof settings[SPEED_CHANGE_KEY] === "number"
      ) {
        return `${mod.acronym}${settings[SPEED_CHANGE_KEY]}`;
      }
      if (mod.acronym === "DA" && DIFFICULTY_KEYS.every((k) => typeof settings[k] === "number")) {
        return `DA[${DIFFICULTY_KEYS.map((k) => settings[k]).join(",")}]`;
      }
      return `${mod.acronym}${JSON.stringify(settings)}`;
    })
    .join(" ");
}
