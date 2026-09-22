/**
 * Backend entity & API types (mirrors the Rust backend `to_json` models).
 * All JSON fields are camelCase.
 */

export interface OsuCover {
  customUrl?: string;
  url?: string;
  id?: string;
}

export interface SessionUser {
  id: number;
  osuId: string;
  username: string;
  registeredAt: string | null;
  avatarUrl: string | null;
  pp?: number | null;
  globalRank?: number | null;
  countryRank?: number | null;
  country?: string | null;
  userGroup: string;
  registrationStatus: string;
  season?: string[] | null;
  accuracy?: number | null;
  stamina?: number | null;
  firstSight?: number | null;
  strategy?: number | null;
  experience?: number | null;
  customKey?: string | null;
  customValue?: number | null;
  cover?: OsuCover | null;
  /** g0v0 私服绑定 */
  guServerUserId?: string | null;
  guServerUsername?: string | null;
  guServerBindAt?: string | null;
  g0v0Bound?: boolean;
  /** QQ 联系方式（报名可选填写） */
  qq?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permissions {
  isplayer: boolean;
  isadmin: boolean;
}

export interface AuthMe {
  user: SessionUser;
  permissions: Permissions;
}

export interface PlayerStub {
  osuId: string;
  username: string;
  avatarUrl?: string | null;
  pp?: number | null;
  globalRank?: number | null;
  countryRank?: number | null;
  country?: string | null;
  registrationStatus?: string;
}

export interface MatchRoom {
  id: number;
  roomName: string;
  roundNumber: number;
  matchDate: string | null;
  matchTime: string | null;
  matchNumber: number;
  maxParticipants: number;
  status: string; // open | full | closed
  description?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  schedules?: MatchSchedule[];
  scheduleIds?: number[];
  scoresCount?: number;
  /** 是否已被安排/占用（有赛程，或被 pending/scheduled 对战占用），不可再被预约 */
  claimed?: boolean;
}

export interface MatchSchedule {
  id: number;
  roomId: number | null;
  player1OsuId: string | null;
  player1Username: string | null;
  player2OsuId: string | null;
  player2Username: string | null;
  redScore: number | null;
  blueScore: number | null;
  status: string; // pending | confirmed | completed | cancelled
  replayLink?: string | null;
  matchLink?: string | null;
  streamLink?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  room?: MatchRoom | null;
}

export interface PlayerMatchup {
  id: number;
  roomId: number | null;
  player1OsuId: string;
  player1Username: string;
  player2OsuId: string;
  player2Username: string;
  status: string; // available | scheduled | completed
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  room?: MatchRoom | null;
}

export interface StaffRoomAssignment {
  id: number;
  roomId: number;
  staffOsuId: string;
  staffUsername: string;
  role: string; // referee | commentator | streamer
  createdAt?: string;
  updatedAt?: string;
  room?: MatchRoom | null;
}

export interface MatchScore {
  id: number;
  scheduleId: number;
  playerOsuId: string;
  playerUsername: string;
  score: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MapComment {
  id: number;
  mapSelectionId: number;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  comment: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModdedStats {
  ar?: number;
  cs?: number;
  od?: number;
  hp?: number;
  starRating?: number;
  bpm?: number;
  totalLength?: number;
  [key: string]: any;
}

export interface MapSelection {
  id: number;
  beatmapId: number;
  beatmapsetId: number | null;
  title: string;
  title_unicode?: string | null;
  artist?: string | null;
  artist_unicode?: string | null;
  version: string;
  creator?: string | null;
  starRating: number | null;
  bpm: number | null;
  totalLength: number | null;
  maxCombo?: number | null;
  ar?: number | null;
  cs?: number | null;
  od?: number | null;
  hp?: number | null;
  selectedMods: string | null;
  modPosition?: string | null;
  comment?: string | null;
  selectedBy?: string | null;
  selectedAt?: string | null;
  season?: string | null;
  category?: string | null;
  url?: string | null;
  coverUrl?: string | null;
  approved: boolean;
  padding?: boolean;
  isCustome?: boolean;
  isOrigin?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Admin-extended fields
  customDTRate?: number | null;
  customModName?: string | null;
  selectedByUsername?: string | null;
  selectedByAvatar?: string | null;
  moddedStats?: ModdedStats | null;
}

export interface BeatmapInfo {
  id: number;
  beatmapsetId: number | null;
  title: string;
  title_unicode?: string | null;
  artist?: string | null;
  artist_unicode?: string | null;
  version: string;
  creator?: string | null;
  star_rating: number | null;
  bpm: number | null;
  total_length: number | null;
  maxCombo?: number | null;
  ar?: number | null;
  cs?: number | null;
  od?: number | null;
  hp?: number | null;
  url?: string | null;
  cover_url?: string | null;
}

export interface ModStatsResult {
  modStats: {
    ar: number;
    cs: number;
    od: number;
    hp: number;
    starRating: number;
    bpm: number;
    totalLength: number;
    aimDifficulty: number;
    speedDifficulty: number;
    maxCombo: number;
    totalHitObjects: number;
    lengthSeconds: number;
    clockRate: number;
    arBase: number;
    odBase: number;
    hpBase: number;
    bpmBase: number;
    lengthBase: number;
    beatmapId: number;
    artist: string;
    title: string;
    creator: string;
  };
  mods: string;
  customModName?: string;
  customDTRate?: number;
}

export interface Message {
  id: number;
  senderOsuId: string;
  senderUsername: string;
  receiverOsuId: string;
  receiverUsername: string;
  type: string; // match_invitation | system_notification | admin_message
  title?: string | null;
  content?: string | null;
  relatedMatchupId?: number | null;
  status: string; // unread | read | archived
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonInfo {
  name: string;
  status: string;
}

export interface Settings {
  tournament_name?: string;
  max_pp_for_registration?: string;
  min_pp_for_registration?: string;
  current_season?: string;
  current_season_stage?: string;
  registration_enabled?: string | boolean;
  mappool_visible?: string | boolean;
  /** 赛季池：{ 赛季id: { name, status } } 字典 */
  seasons?: Record<string, SeasonInfo>;
  availableSeasons?: { value: string; label: string; status?: string }[];
  [key: string]: any;
}

/** 由赛季池生成赛季下拉选项（value=赛季id, label=赛季名）。 */
export function seasonOptions(
  settings?: Settings | null,
): { value: string; label: string; status?: string }[] {
  const seasons = settings?.seasons;
  if (!seasons || typeof seasons !== "object") return [];
  return Object.entries(seasons).map(([id, s]) => ({
    value: id,
    label: (s && (s as SeasonInfo).name) || id,
    status: s && (s as SeasonInfo).status,
  }));
}

/** 根据赛季id取赛季名。 */
export function seasonLabel(settings?: Settings | null, id?: string | null): string {
  if (!id) return "";
  const s = settings?.seasons?.[id];
  return (s && s.name) || id;
}

/** 报名状态常量（与后台 RegistrationStatus 枚举保持一致） */
export const REG_STATUS_LABEL: Record<string, string> = {
  not_registered: "未报名",
  registered: "待审核",
  approved: "已通过",
};

export const REG_STATUS_VARIANT: Record<string, "outline" | "yellow" | "teal"> = {
  not_registered: "outline",
  registered: "yellow",
  approved: "teal",
};

export const REG_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not_registered", label: "未报名" },
  { value: "registered", label: "待审核" },
  { value: "approved", label: "已通过" },
];

export interface SeasonMappoolStat {
  category: string;
  label: string;
  avgStarRating: number;
  avgStarRatingTesting: number;
  avgStarRatingPending: number;
  avgLength: number;
  avgLengthTesting: number;
  avgLengthPending: number;
  avgAr: number;
  avgArTesting: number;
  avgArPending: number;
  avgCs: number;
  avgCsTesting: number;
  avgCsPending: number;
  avgOd: number;
  avgOdTesting: number;
  avgOdPending: number;
  avgHp: number;
  avgHpTesting: number;
  avgHpPending: number;
  avgBpm: number;
  avgBpmTesting: number;
  avgBpmPending: number;
  avgMaxCombo: number;
  avgMaxComboTesting: number;
  avgMaxComboPending: number;
  count: number;
  testingCount: number;
  pendingCount: number;
}

export interface SeasonPlayerStat {
  totalRegistrations: number;
  approvedPlayers: number;
  unapprovedPlayers: number;
  replayCount: number;
}

export interface StaffStats {
  approvedPlayers: number;
  matchRooms: number;
  mappoolSeasons: number;
  replayCount: number;
  totalRegistrations: number;
  totalSchedules: number;
  seasonMappoolStats: Record<string, SeasonMappoolStat[]>;
  seasonStats: Record<string, SeasonPlayerStat>;
  tournamentSettings: {
    currentSeason: string;
    currentSeasonStage: string;
    minPp: number;
    maxPp: number;
    registrationEnabled: boolean;
    mappoolVisible: boolean;
    adminCount: number;
  };
}

export interface AdminUserStub {
  osuId: string;
  username: string;
  avatarUrl?: string | null;
  userGroup: string;
  registrationStatus?: string;
  season?: string[] | null;
  qq?: string | null;
  createdAt?: string;
}

export interface NextMatch {
  id: number;
  opponent: { osuId: string; username: string; avatarUrl?: string | null };
  status: string;
  room?: MatchRoom | null;
}

export interface OsuRoom {
  id: number;
  name: string;
  category?: string;
  type?: string;
  startsAt?: string;
  endsAt?: string;
  participantCount?: number;
  host?: string;
  playlistCount?: number;
  active?: boolean;
}

export interface DisplayScore {
  userId: number;
  username: string;
  avatarUrl?: string;
  countryCode?: string;
  totalScore: number;
  accuracy: number;
  maxCombo: number;
  mods: string[];
  rank: string;
  passed: boolean;
  statistics: { count300: number; count100: number; count50: number; countMiss: number };
  pp?: number;
  endedAt?: string;
  position?: number;
  beatmapId: number;
  beatmapsetId: number;
  roomId: number;
  roomName?: string;
  playlistId?: number;
}

export interface RoomScoresResponse {
  scores: DisplayScore[];
  rooms: OsuRoom[];
  source: "database" | "osu";
}

export interface ContentCheck {
  hasIllegal: boolean;
  triggeredWords: string[];
  text: string;
}

export type UserGroup = "player" | "admin";
export type RegistrationStatus = "not_registered" | "registered" | "approved";
export type StaffRole = "referee" | "commentator" | "streamer";

export const MODS_ORDER: readonly string[] = ["NM", "HD", "HR", "DT", "FM", "LZ", "TB"];

export const CATEGORIES = [
  "全部",
  "资格赛",
  "32强",
  "16强",
  "8强",
  "半决赛",
  "决赛",
  "总决赛",
] as const;

/** 图池阶段选项（value 为后端存储值，label 为中文显示） */
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "qualification", label: "资格赛" },
  { value: "ro16", label: "16强" },
  { value: "quarterfinals", label: "8强" },
  { value: "semifinals", label: "半决赛" },
  { value: "finals", label: "决赛" },
  { value: "grandfinals", label: "总决赛" },
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

/** Return unique mods in the canonical front-of-mod order. */
export function modCountByOrder(list: string[]): string[] {
  const order = MODS_ORDER as readonly string[];
  const seen = Array.from(new Set(list.filter((m) => !!m)));
  return seen.sort((a, b) => order.indexOf(a.split("+")[0]) - order.indexOf(b.split("+")[0]));
}