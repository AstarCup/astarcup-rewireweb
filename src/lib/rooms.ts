import type { MatchRoom } from "@/lib/types";

const STAGE_TOKENS = ["QUA", "RO16", "QF", "SF", "GF", "F"];

const ROUND_LABELS: Record<string, string> = {
  "1": "QUA",
  "2": "RO16",
  "3": "QF",
  "4": "SF",
  "5": "F",
  "6": "GF",
};

/**
 * 房间阶段标签：优先从房间名解析（"GF"、"F #5"、"SF #60"、"QF #3"），
 * 解析不到才用 round_number 映射（老赛季数据的编号与新阶段编号不一致）。
 */
export function stageLabelOf(room: Pick<MatchRoom, "roomName" | "roundNumber">): string {
  const token = (room.roomName || "").trim().split(/[\s#]+/)[0]?.toUpperCase() ?? "";
  if (STAGE_TOKENS.includes(token)) return token;
  return ROUND_LABELS[String(room.roundNumber)] ?? `R${room.roundNumber}`;
}
