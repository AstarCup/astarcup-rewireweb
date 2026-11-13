/**
 * 聊天框内的本地命令：/roll 与 !mp 子命令（照 apl-ref src/renderer/index.js 的 cmdRunner + handleModChange）。
 * 命令走 hub 直发；返回 true 表示输入已作为命令处理，不再当作聊天消息发送。
 */
import { toast } from "@/hooks/use-toast";
import {
  currentPlaylistItem,
  displayName,
  expandModsText,
  hub,
  invokeHub,
  resolveUserId,
  roomSettingsSummary,
  slotCountError,
  type RefRoomState,
  type Team,
} from "@/lib/ref";
import type { MatchTimer } from "@/components/referee/useMatchTimer";

export interface ChatCommandContext {
  room: RefRoomState;
  /** 往聊天区插入系统消息 */
  system: (text: string) => void;
  /** !mp close 成功后收起房间界面 */
  closeRoom: () => void;
  /** 房间倒计时（!mp timer / !mp aborttimer） */
  timer: MatchTimer;
}

const HELP_TEXT =
  "!mp 可用指令：start [秒] / timer <秒> / aborttimer / abort / invite <用户名|#ID> / kick <用户> / ban <用户> / " +
  "lock / unlock / size <人数|0=不限> / set <0|1> [人数] / team <用户> <red|blue> / move <用户> <槽位> / " +
  "map <beatmap> [ruleset] / mods <NM|FM|缩写...>（支持 DT1.15 / DA[4,4,4,4]） / allowed_mods <缩写...> / name <房名> / password <密码> / " +
  "settings / listrefs / addref <用户|#ID> / removeref <用户|#ID> / close；/roll（或 !roll）[上限] 掷点";

function fail(text: string) {
  toast({ variant: "destructive", title: "命令执行失败", description: text });
}

export async function runChatInput(raw: string, ctx: ChatCommandContext): Promise<boolean> {
  const { room, system: onSystem, closeRoom: onRoomClosed, timer } = ctx;
  const trimmed = raw.trim();
  if (!trimmed) return false;

  // /roll [max]（bancho 也认 !roll）
  if (/^[/!]roll(\s|$)/i.test(trimmed)) {
    const arg = trimmed.split(/\s+/)[1];
    const max = arg ? Number(arg) : 100;
    const res = await invokeHub(hub.roll(room.id, Number.isFinite(max) && max > 0 ? max : 100));
    if (!res.ok) fail(res.error.message);
    return true;
  }
  if (!/^!mp(\s|$)/i.test(trimmed)) return false;

  const parts = trimmed.slice(4).trim().split(/\s+/);
  const cmd = (parts[0] ?? "").toLowerCase();
  const args = parts.slice(1);
  if (!cmd) {
    onSystem(HELP_TEXT);
    return true;
  }

  const withUser = async (
    fn: (userId: number) => ReturnType<typeof hub.invitePlayer>,
  ): Promise<boolean> => {
    const userId = await resolveUserId(args[0] ?? "");
    if (userId == null) {
      fail(`找不到用户：${args[0] ?? "(空)"}`);
      return true;
    }
    const res = await invokeHub(fn(userId));
    if (!res.ok) fail(res.error.message);
    return true;
  };

  /** 校验人数参数（0 = 不限，其余 2–16），返回 null 表示非法 */
  const parseSlots = (value: string | undefined): number | null => {
    const n = Number(value ?? "");
    if (value == null || value === "" || !Number.isFinite(n)) return null;
    if (n !== 0 && slotCountError(n)) return null;
    return n;
  };

  switch (cmd) {
    case "help":
      onSystem(HELP_TEXT);
      return true;

    case "start": {
      const sec = args[0] ? Number(args[0]) : 0;
      if (!Number.isFinite(sec) || sec < 0) {
        onSystem("用法：!mp start [倒计时秒数]");
        return true;
      }
      const res = await invokeHub(hub.startMatch(room.id, Math.floor(sec)));
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "abort": {
      const res = await invokeHub(hub.abortMatch(room.id));
      if (!res.ok) fail(res.error.message);
      return true;
    }

    // 房间聊天倒计时（只播报，不开始比赛）—— 对应 apl-ref 的 !mp timer / aborttimer
    case "timer": {
      const sec = Number(args[0] ?? "");
      if (!Number.isFinite(sec) || sec <= 0) {
        onSystem("用法：!mp timer <秒数>");
        return true;
      }
      timer.start(Math.floor(sec));
      return true;
    }
    case "aborttimer": {
      timer.stop();
      return true;
    }

    case "invite":
      return withUser((userId) => hub.invitePlayer(room.id, userId));
    case "kick":
      return withUser((userId) => hub.kickPlayer(room.id, userId));
    case "ban":
      return withUser((userId) => hub.banUser(room.id, userId));
    case "addref":
      return withUser((userId) => hub.addReferee(room.id, userId));
    case "removeref":
      return withUser((userId) => hub.removeReferee(room.id, userId));

    case "lock":
    case "unlock": {
      const res = await invokeHub(hub.setLockState(room.id, cmd === "lock"));
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "size": {
      const n = parseSlots(args[0]);
      if (n == null) {
        onSystem("用法：!mp size <人数|0=不限>（人数需 2–16）");
        return true;
      }
      const res = await invokeHub(hub.changeRoomSettings(room.id, { max_participants: n }));
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "set": {
      if (args[0] !== "0" && args[0] !== "1") {
        onSystem("用法：!mp set <0=个人赛|1=团队赛> [人数]");
        return true;
      }
      const type = args[0] === "0" ? "head_to_head" : "team_versus";
      const size = parseSlots(args[1]);
      if (args[1] != null && size == null) {
        onSystem("人数需 2–16（0 为不限）。");
        return true;
      }
      const res = await invokeHub(
        hub.changeRoomSettings(room.id, {
          type,
          ...(size != null ? { max_participants: size } : {}),
        }),
      );
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "team": {
      const team = args[1];
      if (team !== "red" && team !== "blue") {
        onSystem("用法：!mp team <用户> <red|blue>");
        return true;
      }
      return withUser((userId) => hub.moveUserToTeam(room.id, userId, team as Team));
    }
    case "move":
      return withUser((userId) => {
        const slot = (Number(args[1] ?? 1) || 1) - 1;
        return hub.moveUserToSlot(room.id, userId, slot);
      });

    case "map": {
      const beatmap = Number(args[0]);
      const ruleset = args[1] != null ? Number(args[1]) : 0;
      if (!Number.isFinite(beatmap) || beatmap <= 0) {
        onSystem("用法：!mp map <beatmap_id> [ruleset_id]");
        return true;
      }
      const res = await invokeHub(
        hub.editCurrentPlaylistItem(room.id, {
          beatmap_id: beatmap,
          ruleset_id: Number.isFinite(ruleset) ? ruleset : 0,
        }),
      );
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "mods": {
      if (args.length === 0) {
        onSystem(
          "用法：!mp mods <NM|FM|缩写...>，例如 !mp mods HD HR / !mp mods FM / !mp mods HD FM",
        );
        return true;
      }
      const rulesetId = currentPlaylistItem(room)?.ruleset_id ?? 0;
      const parsed = expandModsText(args.join(" "), Number(rulesetId));
      if (parsed.error) {
        onSystem(parsed.error);
        return true;
      }
      const res = await invokeHub(
        hub.editCurrentPlaylistItem(room.id, {
          required_mods: parsed.required,
          allowed_mods: parsed.allowed,
        }),
      );
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "allowed_mods": {
      const parsed = expandModsText(args.join(" "), 0);
      if (parsed.error) {
        onSystem(parsed.error);
        return true;
      }
      const res = await invokeHub(
        hub.editCurrentPlaylistItem(room.id, {
          allowed_mods: parsed.required,
        }),
      );
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "name": {
      const name = args.join(" ").trim();
      if (!name) {
        onSystem("用法：!mp name <新房名>");
        return true;
      }
      const res = await invokeHub(hub.changeRoomSettings(room.id, { name }));
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "password": {
      const res = await invokeHub(hub.changeRoomSettings(room.id, { password: args[0] ?? "" }));
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "settings":
      onSystem(roomSettingsSummary(room));
      return true;
    case "listrefs": {
      const refs = Object.values(room.refs).map((r) => displayName(r.user, r.id));
      onSystem(refs.length > 0 ? `当前裁判：${refs.join("、")}` : "当前房间没有其他裁判");
      return true;
    }
    case "close": {
      const res = await invokeHub(hub.closeRoom(room.id));
      if (res.ok) {
        onSystem("房间已关闭。");
        onRoomClosed();
      } else {
        fail(res.error.message);
      }
      return true;
    }
    default:
      onSystem(`未知指令：!mp ${cmd}（输入 !mp help 查看用法）`);
      return true;
  }
}
