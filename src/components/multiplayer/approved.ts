import type { DisplayScore, PlayerStub } from "@/lib/types";

export interface ApprovedInfo {
  osuIds: Set<string>;
  usernames: Set<string>;
}

/** Build lookup sets from the approved players list. */
export function buildApprovedInfo(players: PlayerStub[]): ApprovedInfo {
  const osuIds = new Set<string>();
  const usernames = new Set<string>();
  for (const p of players) {
    if (p.osuId) osuIds.add(p.osuId);
    if (p.username) usernames.add(p.username);
  }
  return { osuIds, usernames };
}

/** Match a score's user (by username and/or osuId/userId). */
export function isScoreApproved(info: ApprovedInfo, s: Pick<DisplayScore, "username" | "userId">): boolean {
  if (s.username && info.usernames.has(s.username)) return true;
  if (s.userId != null && info.osuIds.has(String(s.userId))) return true;
  return false;
}