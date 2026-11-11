/**
 * 裁判控制台核心库（对应 ascBackend 的 /api/ref/*）。
 *
 * - `hub.*` 构造 osu-server-spectator referee hub 命令（参数形状照 applearon/apl-ref，snake_case）；
 * - `invokeHub` 经后端 SignalR 代理执行命令；
 * - `createRoomState` / `applyHubEvent` / `mergeUser` 维护房间状态（事件语义照 apl-ref models.js）。
 */
import { api, type ApiResult } from "@/lib/api";
import type { DisplayScore } from "@/lib/types";

// ============ 类型 ============

export type MatchType = "head_to_head" | "team_versus";
export type Team = "red" | "blue" | "none";
export type RefConnectionState = "connected" | "connecting" | "disconnected";
export type RefUserStatus =
  | "referee"
  | "idle"
  | "ready"
  | "playing"
  | "finished_play"
  | "spectating"
  | null;

export interface RefMod {
  acronym: string;
  settings?: Record<string, unknown>;
}

/** 图池项保持 osu! API 的 snake_case 原始结构 */
export interface RefPlaylistItem {
  id: number;
  order: number;
  ruleset_id: number;
  beatmap_id: number;
  required_mods: RefMod[];
  allowed_mods: RefMod[];
  freestyle: boolean;
  was_played?: boolean;
}

export interface OsuUserLite {
  id: number;
  username: string;
  avatar_url?: string;
  country_code?: string;
}

export interface RefUser {
  id: number;
  user: OsuUserLite | null;
  team: Team;
  mods: RefMod[];
  style?: unknown;
  status: RefUserStatus;
}

/** 房间状态（顶层 camelCase，图池项为原始 snake_case） */
export interface RefRoomState {
  id: number;
  chatChannelId: number | null;
  name: string;
  password: string | null;
  maxParticipants: number | null;
  playerSlots: (number | null)[];
  players: Record<number, RefUser>;
  refs: Record<number, RefUser>;
  playlistItems: Record<number, RefPlaylistItem>;
  type: MatchType;
  locked: boolean;
  status: "Idle" | "Playing" | "Aborted";
}

/** osu-server-spectator 的 RoomJoinedResponse（字段照 apl-ref models.js） */
export interface RoomJoinedResponse {
  room_id: number;
  chat_channel_id: number | null;
  name: string;
  password: string | null;
  playlist: RefPlaylistItem[];
  max_participants: number | null;
  players: {
    user_id: number;
    team?: string;
    mods?: RefMod[];
    status?: string;
    style?: unknown;
  }[];
  referees: { user_id: number }[];
  state: {
    slots?: (number | null)[];
    type?: MatchType;
    locked?: boolean;
  };
}

export interface HubEvent {
  // biome-ignore lint/suspicious/noExplicitAny: hub 事件载荷结构随事件变化
  data: any;
  event: string;
}

export interface EventLogEntry {
  id: number;
  name: string;
  data: unknown;
  at: Date;
}

export interface ChatLine {
  id: string | number;
  kind: "user" | "system";
  userId?: number;
  username?: string;
  avatarUrl?: string | null;
  content: string;
  isAction?: boolean;
  at?: string;
}

export interface RefBindStatus {
  bound: boolean;
  username?: string;
  osuId?: string;
  expiresAt?: string | null;
}

/** applyHubEvent 的返回：新房间状态 + 插入聊天的系统消息 + 特殊处理信号 */
export interface HubEventResult {
  room: RefRoomState;
  systemMessages: string[];
  /** 自己被踢出房间 */
  kickedSelf: boolean;
  /** MatchCompleted 时需要刷新比分的 playlist item id */
  refreshScoresWith: number | null;
  /** 事件里出现、但本地还没有资料的用户（照 apl-ref 的 GetUser 补全） */
  needUserIds: number[];
}

export interface RefStatus {
  bound: boolean;
  state: RefConnectionState;
  lastError?: string | null;
}

export interface ChangeRoomSettingsParams {
  name?: string;
  password?: string;
  type?: MatchType;
  max_participants?: number;
}

export interface OsuBeatmap {
  id: number;
  version: string;
  // biome-ignore lint/suspicious/noExplicitAny: osu 原始响应
  beatmapset: { id: number; artist: string; title: string; [key: string]: any };
  // biome-ignore lint/suspicious/noExplicitAny: osu 原始响应
  [key: string]: any;
}

/**
 * osu! API v2 的 ChatMessage。
 * 注意：官方字段是 `message_id`（发送接口也是），`id` 只是历史兼容。
 */
export interface OsuChatMessage {
  /** 兼容字段（部分接口/旧版返回 id） */
  id?: number;
  message_id?: number;
  user_id?: number;
  sender_id?: number;
  timestamp: string;
  content: string;
  is_action?: boolean;
  /** 个别接口会直接带发送者资料 */
  sender?: OsuUserLite;
  // biome-ignore lint/suspicious/noExplicitAny: osu 原始响应
  [key: string]: any;
}

/** 取聊天消息 id（osu 官方是 message_id） */
export function chatMessageId(msg: OsuChatMessage | null | undefined): number | null {
  return asNum(msg?.message_id) ?? asNum(msg?.id);
}

/** 取发送者 id（osu 官方是 sender_id） */
export function chatMessageUserId(msg: OsuChatMessage | null | undefined): number {
  return (
    asNum(msg?.sender_id) ??
    asNum(msg?.user_id) ??
    asNum(msg?.sender?.id) ??
    0
  );
}

// ============ hub 命令构造 + 执行 ============

export interface HubCommand {
  command: string;
  args: unknown[];
}

/** 构造命令（不发送），交由 invokeHub 执行 */
export const hub = {
  ping: (message: string): HubCommand => ({ command: "Ping", args: [message] }),
  makeRoom: (req: {
    ruleset_id: number;
    beatmap_id: number;
    name: string;
    max_participants: number;
  }): HubCommand => ({ command: "MakeRoom", args: [req] }),
  joinRoom: (roomId: number): HubCommand => ({ command: "JoinRoom", args: [roomId] }),
  closeRoom: (roomId: number): HubCommand => ({ command: "CloseRoom", args: [roomId] }),
  invitePlayer: (roomId: number, userId: number): HubCommand => ({
    command: "InvitePlayer",
    args: [roomId, userId],
  }),
  kickPlayer: (roomId: number, userId: number): HubCommand => ({
    command: "KickPlayer",
    args: [roomId, userId],
  }),
  banUser: (roomId: number, bannedUserId: number): HubCommand => ({
    command: "BanUser",
    args: [roomId, bannedUserId],
  }),
  addReferee: (roomId: number, targetUserId: number): HubCommand => ({
    command: "AddReferee",
    args: [roomId, targetUserId],
  }),
  removeReferee: (roomId: number, targetUserId: number): HubCommand => ({
    command: "RemoveReferee",
    args: [roomId, targetUserId],
  }),
  listRooms: (): HubCommand => ({ command: "ListRooms", args: [] }),
  changeRoomSettings: (roomId: number, req: ChangeRoomSettingsParams): HubCommand => ({
    command: "ChangeRoomSettings",
    args: [roomId, req],
  }),
  editCurrentPlaylistItem: (
    roomId: number,
    req: {
      beatmap_id?: number;
      ruleset_id?: number;
      required_mods?: RefMod[];
      allowed_mods?: RefMod[];
    },
  ): HubCommand => ({ command: "EditCurrentPlaylistItem", args: [roomId, req] }),
  addPlaylistItem: (
    roomId: number,
    req: {
      beatmap_id: number;
      ruleset_id: number;
      required_mods: RefMod[];
      allowed_mods: RefMod[];
      freestyle: boolean;
    },
  ): HubCommand => ({ command: "AddPlaylistItem", args: [roomId, req] }),
  editPlaylistItem: (
    roomId: number,
    req: {
      playlist_item_id: number;
      beatmap_id: number;
      ruleset_id: number;
      required_mods: RefMod[];
      allowed_mods: RefMod[];
      freestyle: boolean;
    },
  ): HubCommand => ({ command: "EditPlaylistItem", args: [roomId, req] }),
  removePlaylistItem: (roomId: number, playlistItemId: number): HubCommand => ({
    command: "RemovePlaylistItem",
    args: [roomId, { playlist_item_id: playlistItemId }],
  }),
  roll: (roomId: number, max: number): HubCommand => ({
    command: "Roll",
    args: [roomId, { max }],
  }),
  moveUserToTeam: (roomId: number, userId: number, team: Team): HubCommand => ({
    command: "MoveUser",
    args: [roomId, { user_id: userId, team }],
  }),
  moveUserToSlot: (roomId: number, userId: number, slot: number): HubCommand => ({
    command: "MoveUser",
    args: [roomId, { user_id: userId, slot }],
  }),
  setLockState: (roomId: number, locked: boolean): HubCommand => ({
    command: "SetLockState",
    args: [roomId, { locked }],
  }),
  startMatch: (roomId: number, countdown: number): HubCommand => ({
    command: "StartMatch",
    args: [roomId, { countdown }],
  }),
  stopMatchCountdown: (roomId: number): HubCommand => ({
    command: "StopMatchCountdown",
    args: [roomId],
  }),
  abortMatch: (roomId: number): HubCommand => ({ command: "AbortMatch", args: [roomId] }),
};

/** 执行 hub 命令（经后端 SignalR 代理），返回 hub 的 result */
export async function invokeHub<T = unknown>(cmd: HubCommand): Promise<ApiResult<T>> {
  const res = await api.post<{ result: T }>("/api/ref/invoke", cmd);
  if (res.ok) {
    return { ok: true, data: res.data.result, message: res.message };
  }
  return res;
}

// ============ 后端 REST（绑定 / 连接 / 聊天 / 比分 / 资料） ============

export const refApi = {
  getBindStatus: () => api.get<RefBindStatus>("/api/ref/bind/status"),
  getBindUrl: () => api.get<{ authUrl: string }>("/api/ref/bind/url"),
  clearBind: () => api.post<{ bound: boolean }>("/api/ref/bind/clear"),
  connect: () => api.post<RefStatus>("/api/ref/connect"),
  getStatus: () => api.get<RefStatus>("/api/ref/status"),
  /** 后端记住的当前房间快照（刷新后恢复界面用） */
  getRoom: () => api.get<{ room: RoomJoinedResponse | null }>("/api/ref/room"),
  /** 关闭 / 被踢后清掉后端快照 */
  clearRoom: () => api.post<{ room: null }>("/api/ref/room/clear"),
  sendChat: (channelId: number | null, message: string) =>
    api
      .post<{ message: OsuChatMessage }>("/api/ref/chat/send", { channelId, message })
      .then(unwrapMessage),
  getChatMessages: (channelId: number, after?: number) =>
    api
      .get<{ messages: OsuChatMessage[] }>(
        `/api/ref/chat/messages?channelId=${channelId}${after != null ? `&after=${after}` : ""}`,
      )
      .then(unwrapMessages),
  user: (lookup: number | string) => api.get<OsuUserLite>(`/api/ref/user/${lookup}`),
  beatmap: (beatmapId: number) => api.get<OsuBeatmap>(`/api/ref/beatmap/${beatmapId}`),
  getRoomScores: (roomId: number, playlistId: number) =>
    api
      .get<DisplayScore[] | { scores?: DisplayScore[] }>(
        `/api/osu/rooms/${roomId}/playlists/${playlistId}/scores`,
      )
      .then(unwrapScores),
};

// —— 后端信封（{ messages } / { message } / { scores }）→ 扁平结构 ——

function unwrapMessages(
  res: ApiResult<{ messages: OsuChatMessage[] }>,
): ApiResult<OsuChatMessage[]> {
  return res.ok ? { ok: true, data: res.data.messages ?? [], message: res.message } : res;
}

function unwrapMessage(
  res: ApiResult<{ message: OsuChatMessage }>,
): ApiResult<OsuChatMessage> {
  return res.ok ? { ok: true, data: res.data.message, message: res.message } : res;
}

function unwrapScores(
  res: ApiResult<DisplayScore[] | { scores?: DisplayScore[] }>,
): ApiResult<DisplayScore[]> {
  if (!res.ok) return res;
  const list = Array.isArray(res.data) ? res.data : (res.data?.scores ?? []);
  return { ok: true, data: list, message: res.message };
}

/** 订阅 SSE（hub 事件 + 连接状态），返回取消函数 */
export function subscribeRefEvents(handlers: {
  onHub: (ev: HubEvent) => void;
  onState: (state: RefConnectionState, lastError?: string | null) => void;
}): () => void {
  const es = new EventSource("/api/ref/events", { withCredentials: true });
  es.addEventListener("hub", (e) => {
    try {
      handlers.onHub(JSON.parse((e as MessageEvent).data));
    } catch {
      /* 忽略坏帧 */
    }
  });
  es.addEventListener("state", (e) => {
    try {
      const st = JSON.parse((e as MessageEvent).data);
      handlers.onState(st.state, st.lastError ?? null);
    } catch {
      /* 忽略坏帧 */
    }
  });
  return () => es.close();
}

// ============ 房间状态（纯函数，事件语义照 apl-ref models.js） ============

function mkUser(id: number, status: RefUserStatus): RefUser {
  return { id, user: null, team: "none", mods: [], status };
}

function modeOf(items: Record<number, RefPlaylistItem>): number {
  return Object.values(items).find((x) => Number(x.order) === 0)?.ruleset_id ?? 0;
}

/** 当前图（order == 0） */
export function currentPlaylistItem(room: RefRoomState): RefPlaylistItem | undefined {
  return Object.values(room.playlistItems).find((x) => Number(x.order) === 0);
}

/** 图池按 order 排序 */
export function sortedPlaylistItems(room: RefRoomState): RefPlaylistItem[] {
  return Object.values(room.playlistItems).sort((a, b) => Number(a.order) - Number(b.order));
}

/** RoomJoinedResponse → RefRoomState */
export function createRoomState(resp: RoomJoinedResponse): RefRoomState {
  const playlistItems: Record<number, RefPlaylistItem> = {};
  for (const item of resp.playlist ?? []) {
    if (!item.was_played) playlistItems[item.id] = item;
  }
  const room: RefRoomState = {
    id: resp.room_id,
    chatChannelId: resp.chat_channel_id ?? null,
    name: resp.name,
    password: resp.password ?? null,
    maxParticipants: resp.max_participants || null,
    playerSlots: resp.state?.slots ?? (resp.players ?? []).map((p) => p.user_id),
    players: {},
    refs: {},
    playlistItems,
    type: resp.state?.type ?? "head_to_head",
    locked: resp.state?.locked ?? false,
    status: "Idle",
  };
  for (const ref of resp.referees ?? []) {
    room.refs[ref.user_id] = mkUser(ref.user_id, "referee");
  }
  for (const p of resp.players ?? []) {
    room.players[p.user_id] = {
      id: p.user_id,
      user: null,
      team: (p.team as Team) ?? "none",
      mods: p.mods ?? [],
      style: p.style ?? null,
      status: (p.status as RefUserStatus) ?? "idle",
    };
  }
  void modeOf(room.playlistItems); // mode 由 currentPlaylistItem 按需计算
  return room;
}

/** 把拉取到的 osu! 用户资料合并进房间玩家/裁判缓存 */
export function mergeUser(room: RefRoomState, user: OsuUserLite): RefRoomState {
  const patch = (u: RefUser): RefUser => (u.id === user.id ? { ...u, user } : u);
  return {
    ...room,
    players: Object.fromEntries(
      Object.entries(room.players).map(([k, u]) => [k, patch(u)]),
    ),
    refs: Object.fromEntries(Object.entries(room.refs).map(([k, u]) => [k, patch(u)])),
  };
}

/**
 * 应用一个 hub 事件，返回新房间状态与后续处理信号。
 * 事件字段名照 apl-ref models.js 的 EventQueue。
 */
export function applyHubEvent(
  room: RefRoomState,
  ev: HubEvent,
  meId?: string | null,
): HubEventResult {
  const systemMessages: string[] = [];
  let kickedSelf = false;
  let refreshScoresWith: number | null = null;
  const needUserIds: number[] = [];
  const wantUser = (u: RefUser | undefined | null) => {
    if (u && !u.user && !needUserIds.includes(u.id)) needUserIds.push(u.id);
  };
  const data = ev.data ?? {};
  const next: RefRoomState = {
    ...room,
    players: { ...room.players },
    refs: { ...room.refs },
    playlistItems: { ...room.playlistItems },
    playerSlots: [...room.playerSlots],
  };
  const dropFromSlots = (id: number) => {
    if (next.maxParticipants == null) {
      next.playerSlots = next.playerSlots.filter((x) => x !== id);
    }
  };

  switch (ev.event) {
    case "UserJoined": {
      const id = asNum(data.user_id);
      if (id == null) break;
      const existing = next.players[id] ?? next.refs[id];
      const u = existing ?? mkUser(id, "idle");
      if (u.status !== "referee") {
        u.status = "idle";
        u.team = "none";
      }
      next.players[id] = u;
      if (next.maxParticipants == null) next.playerSlots = [...next.playerSlots, id];
      wantUser(u);
      break;
    }
    case "UserLeft": {
      const id = asNum(data.user_id);
      if (id == null) break;
      delete next.players[id];
      dropFromSlots(id);
      break;
    }
    case "UserKicked": {
      const id = asNum(data.kicked_user_id);
      if (id == null) break;
      if (meId != null && String(data.kicked_user_id) === meId) kickedSelf = true;
      delete next.players[id];
      dropFromSlots(id);
      break;
    }
    case "UserBanned": {
      // 源事件字段是 banned_user_id（apl-ref 这里漏了，删到 undefined）
      const id = asNum(data.banned_user_id) ?? asNum(data.user_id);
      if (id == null) break;
      delete next.players[id];
      delete next.refs[id];
      dropFromSlots(id);
      break;
    }
    case "RefereeAdded": {
      const id = asNum(data.user_id);
      if (id == null) break;
      const u = next.refs[id] ?? next.players[id] ?? mkUser(id, "referee");
      u.status = "referee";
      next.refs[id] = u;
      wantUser(u);
      break;
    }
    case "RefereeRemoved": {
      const id = asNum(data.user_id);
      if (id != null) delete next.refs[id];
      break;
    }
    case "RoomSettingsChanged": {
      if (typeof data.name === "string") next.name = data.name;
      next.password = data.password ?? null;
      if (data.type) next.type = data.type;
      next.maxParticipants = asNum(data.max_participants) || null;
      if (next.maxParticipants == null) {
        next.playerSlots = next.playerSlots.filter((x) => x != null);
      }
      break;
    }
    case "MatchStateChanged": {
      if (data.state?.locked != null) next.locked = !!data.state.locked;
      if (data.state?.type) next.type = data.state.type;
      if (data.state?.slots) {
        next.playerSlots = data.state.slots;
        next.maxParticipants = data.state.slots.length;
      }
      break;
    }
    case "PlaylistItemAdded": {
      const item: RefPlaylistItem = data.playlist_item;
      if (!item) break;
      if (item.was_played) delete next.playlistItems[item.id];
      else next.playlistItems[item.id] = item;
      break;
    }
    case "PlaylistItemChanged": {
      const item: RefPlaylistItem = data.playlist_item;
      if (!item) break;
      if (item.was_played) {
        delete next.playlistItems[item.id];
      } else if (next.playlistItems[item.id]) {
        next.playlistItems[item.id] = { ...next.playlistItems[item.id], ...item };
      } else {
        next.playlistItems[item.id] = item;
      }
      break;
    }
    case "PlaylistItemRemoved": {
      const id = asNum(data.playlist_item_id);
      if (id != null) delete next.playlistItems[id];
      break;
    }
    case "UserStatusChanged": {
      const id = asNum(data.user_id);
      if (id != null && next.players[id]) {
        next.players[id].status = (data.status as RefUserStatus) ?? next.players[id].status;
      }
      const all = Object.values(next.players);
      if (all.length > 0 && all.every((p) => p.status === "ready")) {
        systemMessages.push("All players are ready");
      }
      break;
    }
    case "UserModsChanged": {
      const id = asNum(data.user_id);
      if (id != null && next.players[id]) next.players[id].mods = data.mods ?? [];
      break;
    }
    case "UserTeamChanged": {
      const id = asNum(data.user_id);
      if (id != null && next.players[id]) {
        next.players[id].team = (data.team as Team) ?? "none";
      }
      break;
    }
    case "MatchStarted":
      next.status = "Playing";
      break;
    case "MatchAborted":
      next.status = "Aborted";
      break;
    case "MatchCompleted": {
      next.status = "Idle";
      // 事件自带 playlist_item_id（照 apl-ref index.js 的 MatchCompleted）；
      // 房间可能已自动切到下一张图，用当前图会取错比分。
      const playedId = asNum(data.playlist_item_id);
      refreshScoresWith = playedId ?? currentPlaylistItem(next)?.id ?? null;
      break;
    }
    case "RollCompleted": {
      const uid = asNum(data.user_id) ?? -1;
      const rolled = next.players[uid] ?? next.refs[uid];
      const name = displayName(rolled?.user ?? null, uid);
      systemMessages.push(`${name} rolled ${data.result}/${data.max}`);
      if (rolled) wantUser(rolled);
      break;
    }
    default:
      break;
  }
  return { room: next, systemMessages, kickedSelf, refreshScoresWith, needUserIds };
}

// ============ 小工具 ============

export function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** 槽位数校验：0=不限，限容 2–16 */
export function slotCountError(n: number): string | null {
  if (!Number.isFinite(n) || n === 0) return "0 表示不限人数；限容请输入 2–16。";
  if (n < 2 || n > 16) return "人数需在 2–16 之间（0 为不限）。";
  return null;
}

export function roomLink(roomId: number): string {
  return `https://osu.ppy.sh/multiplayer/rooms/${roomId}`;
}

export function displayName(user: OsuUserLite | null | undefined, id: number): string {
  return user?.username ?? `#${id}`;
}

export function modsText(mods: RefMod[] | undefined | null): string {
  return (mods ?? []).map((m) => m.acronym).join(" ");
}

/** "HD HR" / "HD,HR" → [{acronym:"HD"},{acronym:"HR"}] */
export function parseModText(text: string): RefMod[] {
  return text
    .split(/[\s+,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length >= 2)
    .map((acronym) => ({ acronym }));
}

export function hasModSettings(m: RefMod): boolean {
  return !!m.settings && Object.keys(m.settings).length > 0;
}

export function modSettingsText(m: RefMod): string {
  if (!hasModSettings(m)) return "";
  return Object.entries(m.settings ?? {})
    .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" ");
}

// ============ !mp mods 解析（照 apl-ref index.js 的 handleModChange） ============

/**
 * Freemod / Freestyle 可选 mod（对应 lazer 的 ValidForMultiplayerAsFreeMod）。
 * apl-ref 从 mods.json 读；这里取各规则集通用的手动可选 mod 集合。
 */
const FREE_MOD_ACRONYMS: Record<number, string[]> = {
  0: ["EZ", "HD", "HR", "DT", "HT", "FL", "SO", "NF"],
  1: ["EZ", "HD", "HR", "DT", "HT", "FL", "SO", "NF"],
  2: ["EZ", "HD", "HR", "DT", "HT", "FL", "SO", "NF"],
  3: ["EZ", "HD", "HR", "DT", "HT", "FL", "SO", "NF"],
};

/** 互斥 mod（用于把 allowed_mods 里和 required_mods 冲突的项剔掉） */
const INCOMPATIBLE: Record<string, string[]> = {
  DT: ["HT"],
  HT: ["DT"],
  EZ: ["HR"],
  HR: ["EZ"],
  HD: ["FL"],
  FL: ["HD"],
  NF: ["SD", "PF"],
  SD: ["NF", "PF"],
  PF: ["NF", "SD"],
  SO: ["SD", "PF"],
};

/** Difficulty Adjust 的参数顺序：CS / AR / OD / HP */
export const DIFFICULTY_KEYS = [
  "circle_size",
  "approach_rate",
  "overall_difficulty",
  "drain_rate",
] as const;

export interface ExpandedMods {
  required: RefMod[];
  allowed: RefMod[];
  /** 解析失败的原因（不改动图池） */
  error?: string;
}

/** 按空白 / `+` / `,` 切分，但括号内的逗号保留（如 DA[4,4,4,4]） */
function splitModTokens(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "[" || ch === "{") depth += 1;
    else if (ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    if (depth === 0 && /[\s+,]/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** 解析单个 mod 的参数：JSON 对象 / DA 数组 / DT·HT 倍率数字 */
function parseModSettings(
  acronym: string,
  rest: string,
): { settings?: Record<string, unknown>; error?: string } {
  if (rest.startsWith("{")) {
    try {
      const obj: unknown = JSON.parse(rest);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        return { settings: obj as Record<string, unknown> };
      }
    } catch {
      /* 落到下面的错误提示 */
    }
    return { error: `${acronym} 的参数不是合法 JSON 对象：${rest}` };
  }

  if (rest.startsWith("[")) {
    try {
      const arr: unknown = JSON.parse(rest);
      if (Array.isArray(arr)) {
        if (acronym === "DA") {
          if (arr.length === 0 || arr.length > DIFFICULTY_KEYS.length) {
            return { error: "DA 的参数格式：DA[cs,ar,od,hp]" };
          }
          return {
            settings: Object.fromEntries(
              arr.map((v, i) => [DIFFICULTY_KEYS[i], Number(v)]),
            ) as Record<string, unknown>,
          };
        }
        return { error: `${acronym} 不支持数组参数，请写成 ${acronym}{"key":value}` };
      }
    } catch {
      /* 落到下面的错误提示 */
    }
    return { error: `${acronym} 的参数不是合法 JSON 数组：${rest}` };
  }

  const rate = Number(rest);
  if (Number.isFinite(rate) && rate > 0) {
    if (acronym === "DT" || acronym === "HT") return { settings: { speed_change: rate } };
    return { error: `${acronym} 不支持数字参数` };
  }
  return { error: `无法解析的 mod 参数：${acronym}${rest}` };
}

/**
 * `HD HR` / `FM` / `HD FM` / `DT1.15` / `DA[4,4,4,4]` → required + allowed。
 *
 * - `NM` 清空、`FM` 展开成 freemod 白名单（与 required 中互斥的 mod 做差集）；
 * - 带参数的写法：`DT1.15` / `HT0.8`（speed_change）、`DA[cs,ar,od,hp]`、
 *   `HD{"key":value}`（任意 mod settings）。
 */
export function expandModsText(text: string, rulesetId: number): ExpandedMods {
  const tokens = splitModTokens(text);
  if (tokens.length === 0) return { required: [], allowed: [] };

  const required: RefMod[] = [];
  let freeMod = false;
  for (const token of tokens) {
    const matched = /^([A-Za-z]{2})(.*)$/.exec(token);
    if (!matched) {
      return { required: [], allowed: [], error: `无效的 mod 缩写：${token}` };
    }
    const acronym = matched[1].toUpperCase();
    const rest = matched[2].trim();
    if (acronym === "NM") continue;
    if (acronym === "FM") {
      freeMod = true;
      continue;
    }
    if (!rest) {
      if (!required.some((m) => m.acronym === acronym)) required.push({ acronym });
      continue;
    }
    const parsed = parseModSettings(acronym, rest);
    if (parsed.error) return { required: [], allowed: [], error: parsed.error };
    const settings = parsed.settings ?? {};
    const existing = required.find((m) => m.acronym === acronym);
    if (existing) existing.settings = settings;
    else required.push({ acronym, settings });
  }

  const blocked = new Set<string>(required.map((m) => m.acronym));
  for (const m of required) for (const bad of INCOMPATIBLE[m.acronym] ?? []) blocked.add(bad);

  const allowed = freeMod
    ? (FREE_MOD_ACRONYMS[rulesetId] ?? FREE_MOD_ACRONYMS[0])
        .filter((a) => !blocked.has(a))
        .map((acronym) => ({ acronym }))
    : [];

  return { required, allowed };
}

/** 房间设置摘要（!mp settings / 顶栏提示用） */
export function roomSettingsSummary(room: RefRoomState): string {
  const type = room.type === "team_versus" ? "团队赛" : "个人赛";
  const size = room.maxParticipants == null ? "不限人数" : `限 ${room.maxParticipants} 人`;
  const players = Object.values(room.players).filter((p) => p.status !== "referee").length;
  const refs = Object.keys(room.refs).length;
  return [
    `房间 #${room.id}「${room.name}」`,
    type,
    size,
    room.locked ? "已锁定" : "未锁定",
    `玩家 ${players}`,
    refs > 0 ? `裁判 ${refs}` : null,
    room.password ? "有密码" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// ============ beatmap 缓存 ============

const beatmapCache = new Map<number, Promise<OsuBeatmap | null>>();

export function getBeatmapCached(beatmapId: number): Promise<OsuBeatmap | null> {
  let p = beatmapCache.get(beatmapId);
  if (!p) {
    p = refApi.beatmap(beatmapId).then((res) => {
      // 只缓存成功结果，失败下次还能重试（照 apl-ref 的 window.beatmaps 缓存）
      if (!res.ok) {
        beatmapCache.delete(beatmapId);
        return null;
      }
      return res.data;
    });
    beatmapCache.set(beatmapId, p);
  }
  return p;
}

/** 解析「用户名 / ID / #ID」→ 用户 ID（找不到返回 null） */
export async function resolveUserId(nameOrId: string): Promise<number | null> {
  // 照 apl-ref 的 ircStyleUsername：`#123456` 直接当 osu! ID
  const t = nameOrId.trim().replace(/^#/, "");
  if (!t) return null;
  const asId = asNum(t);
  if (asId != null) return asId;
  const res = await refApi.user(t);
  return res.ok && res.data?.id ? res.data.id : null;
}
