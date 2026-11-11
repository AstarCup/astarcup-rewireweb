/**
 * 聊天框内的本地命令：/roll 与 !mp 子命令（照 apl-ref src/renderer/index.js 的 cmdRunner 精简）。
 * 命令走 hub 直发；返回 true 表示输入已作为命令处理，不再当作聊天消息发送。
 */
import { toast } from "@/hooks/use-toast";
import {
  hub,
  invokeHub,
  parseModText,
  resolveUserId,
  type RefRoomState,
  type Team,
} from "@/lib/ref";

export interface ChatCommandContext {
  room: RefRoomState;
  /** 往聊天区插入系统消息 */
  system: (text: string) => void;
  /** !mp close 成功后收起房间界面 */
  closeRoom: () => void;
}

const HELP_TEXT =
  "!mp 可用指令：start [秒] / abort / invite <用户> / kick <用户> / ban <用户> / lock / unlock / " +
  "size <人数> / set <0|1> [人数] / team <用户> <red|blue> / move <用户> <槽位> / " +
  "map <beatmap> [ruleset] / mods <缩写...> / allowed_mods <缩写...> / name <房名> / password <密码> / " +
  "addref <用户> / removeref <用户> / close；/roll [上限] 掷点";

function fail(text: string) {
  toast({ variant: "destructive", title: "命令执行失败", description: text });
}

export async function runChatInput(
  raw: string,
  ctx: ChatCommandContext,
): Promise<boolean> {
  const { room, system: onSystem, closeRoom: onRoomClosed } = ctx;
  const trimmed = raw.trim();
  if (!trimmed) return false;

  // /roll [max]
  if (trimmed === "/roll" || trimmed.startsWith("/roll ")) {
    const arg = trimmed.split(/\s+/)[1];
    const max = arg ? Number(arg) : 100;
    const res = await invokeHub(hub.roll(room.id, Number.isFinite(max) && max > 0 ? max : 100));
    if (!res.ok) fail(res.error.message);
    return true;
  }
  if (!trimmed.startsWith("!mp ")) return false;

  const parts = trimmed.slice(4).trim().split(/\s+/);
  const cmd = (parts[0] ?? "").toLowerCase();
  const args = parts.slice(1);

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

  switch (cmd) {
    case "help":
      onSystem(HELP_TEXT);
      return true;

    case "start": {
      const sec = args[0] ? Number(args[0]) : 0;
      const res = await invokeHub(hub.startMatch(room.id, Number.isFinite(sec) ? sec : 0));
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "abort": {
      const res = await invokeHub(hub.abortMatch(room.id));
      if (!res.ok) fail(res.error.message);
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
      const n = Number(args[0]);
      if (!Number.isFinite(n)) {
        fail("用法：!mp size <人数|0=不限>");
        return true;
      }
      const res = await invokeHub(hub.changeRoomSettings(room.id, { max_participants: n }));
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "set": {
      const type = args[0] === "0" ? "head_to_head" : "team_versus";
      const size = args[1] ? Number(args[1]) : undefined;
      const res = await invokeHub(
        hub.changeRoomSettings(room.id, {
          type,
          ...(size != null && Number.isFinite(size) ? { max_participants: size } : {}),
        }),
      );
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "team":
      return withUser((userId) =>
        hub.moveUserToTeam(room.id, userId, (args[1] as Team) ?? "red"),
      );
    case "move":
      return withUser((userId) => {
        const slot = (Number(args[1] ?? 1) || 1) - 1;
        return hub.moveUserToSlot(room.id, userId, slot);
      });

    case "map": {
      const beatmap = Number(args[0]);
      const ruleset = args[1] != null ? Number(args[1]) : 0;
      if (!Number.isFinite(beatmap)) {
        fail("用法：!mp map <beatmap_id> [ruleset_id]");
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
      const res = await invokeHub(
        hub.editCurrentPlaylistItem(room.id, {
          required_mods: parseModText(args.join(" ")),
          allowed_mods: [],
        }),
      );
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "allowed_mods": {
      const res = await invokeHub(
        hub.editCurrentPlaylistItem(room.id, {
          allowed_mods: parseModText(args.join(" ")),
        }),
      );
      if (!res.ok) fail(res.error.message);
      return true;
    }
    case "name": {
      const name = args.join(" ").trim();
      if (!name) {
        fail("用法：!mp name <新房名>");
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
