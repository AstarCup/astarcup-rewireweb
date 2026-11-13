/**
 * 裁判助手（ref agent）：聊天入口的瘦客户端。
 *
 * 规则与决策在后端（ascBackend /api/ref/agent/*，DeepSeek 工具调用式 agent）：
 * 本模块只负责把聊天命令（!mp …）与关键事件转发给后端，并展示返回的播报与回复。
 */
import { api } from "@/lib/api";
import type { HubEvent, RefRoomState } from "@/lib/ref";
import type { DisplayScore, MatchSchedule, Settings } from "@/lib/types";
// 房间上下文是自由结构（喂给模型的 JSON）
type Json = Record<string, unknown>;

export interface RefAgentDeps {
  getRoom: () => RefRoomState | null;
  getMatchup: () => MatchSchedule | null;
  getSettings: () => Settings | null;
  /** 本地聊天区系统消息 */
  system: (text: string) => void;
  /** 向房间聊天播报（由后端工具执行，这里保留接口兼容） */
  say: (text: string) => Promise<void>;
  /** 拉取当前小节比分（由后端工具执行，这里保留接口兼容） */
  fetchScores: () => Promise<DisplayScore[] | null>;
  /** agent 轮次开始/结束（聊天区显示“处理中”提示） */
  onTurnState?: (busy: boolean) => void;
}

interface AgentTurnResponse {
  reply: string;
  logs: string[];
}

/** 交给 agent 处理的事件（roll 判定、小节结束播报等自动行为） */
const AGENT_EVENTS = new Set(["RollCompleted", "MatchStarted", "MatchAborted", "MatchCompleted"]);

export class RefAgent {
  enabled = true;
  private deps: RefAgentDeps;
  private busyCount = 0;

  constructor(deps: RefAgentDeps) {
    this.deps = deps;
  }

  /** 返回 true 表示输入已由 agent 处理 */
  async handleCommand(raw: string): Promise<boolean> {
    const text = raw.trim();
    if (!/^!mp\s/i.test(text)) return false;

    // 本地开关命令（不经过后端）
    const agentCmd = /^!mp\s+agent\s*(\S+)?/i.exec(text);
    if (agentCmd) {
      const arg = (agentCmd[1] ?? "").toLowerCase();
      if (arg === "on" || arg === "off") {
        this.enabled = arg === "on";
        this.deps.system(`裁判助手已${this.enabled ? "开启" : "关闭"}`);
      } else {
        this.deps.system(`裁判助手当前${this.enabled ? "已开启" : "已关闭"}（!mp agent on|off）`);
      }
      return true;
    }

    if (!this.enabled) return false;
    await this.turn(text, "ref");
    return true;
  }

  /** 关键事件转发给 agent 自动处理 */
  async handleEvent(ev: HubEvent): Promise<void> {
    if (!this.enabled || !AGENT_EVENTS.has(ev.event)) return;
    await this.turn(`[系统事件] ${ev.event} ${JSON.stringify(ev.data ?? {})}`, "event");
  }

  /** 玩家聊天消息：交给后端 agent 判断是否需要回应（闲聊不回应；无改变比赛状态的权限） */
  async handleChatMessage(content: string, userId: number, username: string): Promise<void> {
    if (!this.enabled) return;
    await this.turn(`[玩家消息] ${username}（id ${userId}）：${content}`, "player");
  }

  /** 裁判本人的聊天发言：作为指令 / 情况同步交给 agent 处理 */
  async handleRefMessage(content: string): Promise<void> {
    if (!this.enabled) return;
    await this.turn(`[裁判消息] ${content}`, "ref");
  }

  /** 新建房间后：自动播报本场对局信息（赛季 / 阶段 / 对阵双方） */
  async introduce(): Promise<void> {
    if (!this.enabled) return;
    await this.turn(
      "[任务] 房间刚创建：请结合房间与对局信息，用 announce 播报本场对局介绍（当前赛季、阶段、对阵双方谁 vs 谁），并欢迎选手进入房间。",
      "ref",
    );
  }

  private async turn(text: string, source: "ref" | "event" | "player") {
    this.busyCount += 1;
    if (this.busyCount === 1) this.deps.onTurnState?.(true);
    try {
      await this.runTurn(text, source);
    } finally {
      this.busyCount -= 1;
      if (this.busyCount === 0) this.deps.onTurnState?.(false);
    }
  }

  private async runTurn(text: string, source: "ref" | "event" | "player") {
    const room = this.deps.getRoom();
    if (!room) {
      this.deps.system("裁判助手：尚未进入房间。");
      return;
    }
    const current = Object.values(room.playlistItems).find((x) => Number(x.order) === 0);
    const res = await api.post<AgentTurnResponse>("/api/ref/agent/message", {
      roomId: room.id,
      chatChannelId: room.chatChannelId,
      currentPlaylistItemId: current?.id ?? null,
      text,
      source,
      roomContext: this.buildRoomContext(room),
    });
    if (!res.ok) {
      this.deps.system(`裁判助手出错：${res.error.message}`);
      return;
    }
    for (const log of res.data.logs ?? []) {
      this.deps.system(`📢 ${log}`);
    }
    if (res.data.reply) {
      this.deps.system(`裁判助手：${res.data.reply}`);
    }
  }

  /** 房间/对局上下文（喂给模型的现场信息） */
  private buildRoomContext(room: RefRoomState): Json {
    const matchup = this.deps.getMatchup();
    const settings = this.deps.getSettings();
    const current = Object.values(room.playlistItems).find((x) => Number(x.order) === 0);
    return {
      room: {
        id: room.id,
        name: room.name,
        chatChannelId: room.chatChannelId,
        matchStatus: room.status,
        matchType: room.type,
        locked: room.locked,
        currentPlaylistItemId: current?.id ?? null,
        currentBeatmapId: current?.beatmap_id ?? null,
        players: [...Object.values(room.players), ...Object.values(room.refs)].map((p) => ({
          id: p.id,
          name: p.user?.username ?? `#${p.id}`,
          team: p.team,
          status: p.status,
          mods: p.mods.map((m) => m.acronym),
        })),
      },
      matchup: matchup
        ? {
            season: matchup.season,
            stage: matchup.room ? matchup.room.roomName : null,
            player1: matchup.player1Username,
            player2: matchup.player2Username,
            matchTime: matchup.room?.matchTime ?? null,
          }
        : null,
      siteSettings: settings
        ? {
            currentSeason: settings.current_season ?? null,
            currentStage: settings.current_season_stage ?? null,
            tournamentName: settings.tournament_name ?? null,
          }
        : null,
    };
  }
}
