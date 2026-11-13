/**
 * 公开图池（MapSelection）→ 裁判房间 playlist 的 mod 配置。
 *
 * 图池里的 mod 是展示用的字符串（如 "HD+HR" / "FM" / "DT"），
 * 并可能带自定义 DT 倍率（customDTRate）与自定义 mod 名（customModName）。
 */
import type { MapSelection } from "@/lib/types";
import { expandModsText, type RefMod } from "@/lib/ref";
import { site } from "@/lib/site";

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

/** Beatmapset id usable for /api/beatmaps/download (custom/original maps excluded). */
export function mapFileSid(m: MapSelection): number | null {
  return m.beatmapsetId != null && m.beatmapsetId > 0 ? m.beatmapsetId : null;
}

/** 谱面文件名（zip 打包用，过滤非法字符） */
export function mapFileName(m: MapSelection): string {
  const base = [m.artist, m.title, `[${m.version}]`].filter(Boolean).join(" - ");
  return (base.replace(/[\\/:*?"<>|]/g, "_") || `map_${m.beatmapId}`) + ".osz";
}

/** 生成 OPP 深链：opp://mappool/{tournament}?season=..&category=.. */
export function oppPoolLink(season: string, category: string): string {
  const params = new URLSearchParams();
  params.set("season", season);
  if (category && category !== "全部") params.set("category", category);
  const qs = params.toString();
  return `${site.opp.scheme}://mappool/${site.opp.tournament}${qs ? `?${qs}` : ""}`;
}
