import type { MapSelection } from "@/lib/types";

export type TeamKey = "red" | "blue";
export type MatchMode = "1v1" | "team";
export type BanPickPhase = "ban" | "pick" | "done";
export type BanPickAction = "ban" | "pick";

export interface OBSPlayer {
  username: string;
  avatarUrl: string;
}

export interface OBSTeam {
  name: string;
  players: OBSPlayer[];
  score: number;
}

export interface OBSMatch {
  boFormat: number;
  mode: MatchMode;
  matchTitle: string;
  roomName: string;
}

export interface OBSTimer {
  running: boolean;
  seconds: number;
  label: string;
}

export interface OBSBanPick {
  phase: BanPickPhase;
  redRemaining: number;
  blueRemaining: number;
  picked: MapSelection[];
  banned: MapSelection[];
  currentTeam: TeamKey;
}

export interface OBSRoll {
  red: number;
  blue: number;
  done: boolean;
}

export interface OBSVictory {
  winner: TeamKey | null;
}

export interface OBSState {
  match: OBSMatch;
  teams: { red: OBSTeam; blue: OBSTeam };
  timer: OBSTimer;
  banPick: OBSBanPick;
  currentActiveMap: MapSelection | null;
  roll: OBSRoll;
  victory: OBSVictory;
}

export const BO_OPTIONS = [3, 5, 7, 9, 11, 13] as const;
export const CATEGORY_OPTIONS = [
  "全部",
  "资格赛",
  "32强",
  "16强",
  "8强",
  "半决赛",
  "决赛",
  "总决赛",
] as const;

/** Picks required to win = ceil(bo / 2). */
export function winScore(bo: number): number {
  return Math.ceil(bo / 2);
}

/** Bans per team, derived from the BO format. */
export function bansPerTeam(bo: number): number {
  return bo <= 5 ? 1 : bo <= 9 ? 2 : 3;
}

export function otherTeam(t: TeamKey): TeamKey {
  return t === "red" ? "blue" : "red";
}

export const PHASE_LABEL: Record<BanPickPhase, string> = {
  ban: "禁用阶段",
  pick: "选择阶段",
  done: "已完成",
};

export const TEAM_CLASS: Record<
  TeamKey,
  { chip: string; ring: string; solid: string }
> = {
  red: { chip: "#e85d75", ring: "ring-[#e85d75]", solid: "bg-[#e85d75]" },
  blue: { chip: "#6b7fb5", ring: "ring-[#6b7fb5]", solid: "bg-[#6b7fb5]" },
};