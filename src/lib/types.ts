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
  /** QQ 联系方式（报名可选填写；仅用于联系，不作为机器人鉴权依据） */
  qq?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permissions {
  isplayer: boolean;
  isadmin: boolean;
}

/** 机器人平台身份绑定（QQ / openid 等 -> osu 账号） */
export interface BotBinding {
  id: number;
  platform: string;
  platformUserId: string;
  osuId: string;
  displayName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotBindCode {
  code: string;
  expiresAt: string;
  ttlMinutes: number;
  command: string;
}

/** 私聊一键绑定链接对应的平台身份 */
export interface BotBindLinkInfo {
  platform: string;
  platformUserId: string;
  displayName?: string | null;
  expiresAt: string;
  osuId: string;
  username: string;
  alreadyBound: boolean;
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
  /** 房间所属赛季，例如 s1 / s2；房间下的赛程跟随该值 */
  season?: string | null;
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
  /** 该场比赛所属赛季，例如 s1 / s2 */
  season?: string | null;
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
  /** 对战所属赛季，例如 s1 / s2 */
  season?: string | null;
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
  /** 是否使用 g0v0 私服比赛：开启后报名才要求绑定 g0v0 账号 */
  use_gv0?: string | boolean;
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
  "All",
  "QUA",
  "RO32",
  "RO16",
  "QF",
  "SF",
  "F",
  "GF",
] as const;

/** 图池阶段选项（value 为后端存储值，label 为英文简写） */
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "qualification", label: "QUA" },
  { value: "ro16", label: "RO16" },
  { value: "quarterfinals", label: "QF" },
  { value: "semifinals", label: "SF" },
  { value: "finals", label: "F" },
  { value: "grandfinals", label: "GF" },
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

// ============ 资讯 / 赛季规则（后端 news、season_rules 表）============

/** 资讯列表项（不含正文） */
export interface NewsItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  published: boolean;
  updatedAt?: string;
}

/** 资讯详情（含 markdown 正文） */
export interface NewsDetail extends NewsItem {
  content: string;
  createdAt?: string;
}

/** 新建/更新资讯的请求体 */
export interface NewsInput {
  slug: string;
  title: string;
  description: string;
  date: string;
  content: string;
  published: boolean;
}

/** 赛季规则（Bot 读取的 markdown） */
export interface SeasonRule {
  season: string;
  content: string;
  updatedAt?: string;
}