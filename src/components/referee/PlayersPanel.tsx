import { useState } from "react";
import { Ban, Lock, LockOpen, Search, UserPlus, UserRoundX, Users } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "@/hooks/use-toast";
import {
  displayName,
  hub,
  invokeHub,
  modsText,
  resolveUserId,
  type RefRoomState,
  type RefUser,
  type RefUserStatus,
  type Team,
} from "@/lib/ref";
import type { MatchSchedule } from "@/lib/types";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { BusyButton } from "@/components/ui/busy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusMeta: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  referee: { label: "裁判", variant: "primary" },
  idle: { label: "空闲", variant: "outline" },
  ready: { label: "已准备", variant: "teal" },
  playing: { label: "游戏中", variant: "yellow" },
  finished_play: { label: "已打完", variant: "blue" },
  spectating: { label: "旁观", variant: "outline" },
};

function statusBadge(status: RefUserStatus) {
  const meta = status ? statusMeta[status] : null;
  return <Badge variant={meta?.variant ?? "outline"}>{meta?.label ?? status ?? "—"}</Badge>;
}

function teamBarClass(team: RefUser["team"]) {
  if (team === "red") return "bg-pc-primary";
  if (team === "blue") return "bg-pc-blue";
  return "bg-(--pc-border)";
}

interface PlayersPanelProps {
  room: RefRoomState;
  /** 对战列表选中的对战：有值时显示“一键邀请”两个选手 */
  matchup?: MatchSchedule | null;
}

/** 左栏上半：玩家槽位列表（队伍色条 / 状态徽章 / mods / Kick）+ 邀请 + 锁位 */
export default function PlayersPanel({ room, matchup }: PlayersPanelProps) {
  const confirm = useConfirm();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteAllBusy, setInviteAllBusy] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  /** 最近一次邀请成功的人（弹窗不关，方便连续邀请） */
  const [invited, setInvited] = useState<string[]>([]);

  const toggleLock = async () => {
    setLockBusy(true);
    const res = await invokeHub(hub.setLockState(room.id, !room.locked));
    setLockBusy(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "修改锁位失败", description: res.error.message });
    }
  };

  /** 对战双方中还没进房的选手（已在房里的不再重复邀请） */
  const matchupTargets = matchup
    ? [
        { id: matchup.player1OsuId, name: matchup.player1Username },
        { id: matchup.player2OsuId, name: matchup.player2Username },
      ]
    : [];
  const pendingTargets = matchupTargets.filter((t) => {
    const uid = Number(t.id);
    const inRoom = Number.isFinite(uid) && (room.players[uid] != null || room.refs[uid] != null);
    return !inRoom;
  });

  /** 一键邀请对战双方选手（来自对战列表选中的对战；已在房里的自动跳过） */
  const inviteMatchupPlayers = async () => {
    if (pendingTargets.length === 0) return;
    setInviteAllBusy(true);
    const results: string[] = [];
    for (const t of pendingTargets) {
      const userId = Number(t.id);
      if (!Number.isFinite(userId) || userId <= 0) {
        results.push(`${t.name}：无效的用户 ID`);
        continue;
      }
      const res = await invokeHub(hub.invitePlayer(room.id, userId));
      results.push(res.ok ? `${t.name}：已邀请` : `${t.name}：${res.error.message}`);
    }
    setInviteAllBusy(false);
    const failed = results.some((r) => !r.includes("已邀请"));
    toast({
      ...(failed ? { variant: "destructive" as const } : {}),
      title: "一键邀请对战选手",
      description: results.join("；"),
    });
  };

  const submitInvite = async () => {
    const raw = inviteInput.trim();
    if (!raw) {
      toast({ variant: "destructive", title: "请输入用户名或 osu! ID" });
      return;
    }
    setInviteBusy(true);
    const userId = await resolveUserId(raw);
    if (userId == null) {
      setInviteBusy(false);
      toast({ variant: "destructive", title: "找不到该玩家", description: raw });
      return;
    }
    const res = await invokeHub(hub.invitePlayer(room.id, userId));
    setInviteBusy(false);
    if (res.ok) {
      const label = `#${userId}`;
      setInvited((prev) => (prev.includes(label) ? prev : [...prev, label]));
      setInviteInput("");
      toast({ title: "已发送邀请", description: `用户 ${label}` });
    } else {
      toast({ variant: "destructive", title: "邀请失败", description: res.error.message });
    }
  };

  const kick = async (player: RefUser) => {
    const name = displayName(player.user, player.id);
    if (!(await confirm({ title: `确定要踢出 ${name} 吗？` }))) return;
    const res = await invokeHub(hub.kickPlayer(room.id, player.id));
    if (!res.ok) {
      toast({ variant: "destructive", title: "踢出失败", description: res.error.message });
    }
  };

  const ban = async (player: RefUser) => {
    const name = displayName(player.user, player.id);
    const ok = await confirm({ title: `确定要封禁 ${name} 吗？封禁后对方无法再进入本房间。` });
    if (!ok) return;
    const res = await invokeHub(hub.banUser(room.id, player.id));
    if (!res.ok) {
      toast({ variant: "destructive", title: "封禁失败", description: res.error.message });
    }
  };

  const moveToTeam = async (player: RefUser, team: Team) => {
    const res = await invokeHub(hub.moveUserToTeam(room.id, player.id, team));
    if (!res.ok) {
      toast({ variant: "destructive", title: "分队失败", description: res.error.message });
    }
  };

  const toggleTeam = async (player: RefUser) => {
    if (player.team === "none") return;
    await moveToTeam(player, player.team === "red" ? "blue" : "red");
  };

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <CardTitle className="text-base whitespace-nowrap md:text-lg">玩家</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {pendingTargets.length > 0 && (
            <BusyButton
              size="sm"
              onClick={() => void inviteMatchupPlayers()}
              loading={inviteAllBusy}
              icon={<Users className="h-3.5 w-3.5" />}
              title={`邀请 ${pendingTargets.map((t) => t.name).join(" 与 ")} 加入房间`}
            >
              一键邀请
            </BusyButton>
          )}
          <Button variant="teal" size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> 邀请
          </Button>
          <Button variant="outline" size="sm" onClick={toggleLock} disabled={lockBusy}>
            {room.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            {room.locked ? "已锁定" : "未锁定"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-[420px] overflow-y-auto">
        <div className="flex flex-col gap-2">
          {room.playerSlots.map((slotId, index) => {
            const player =
              slotId != null ? (room.players[slotId] ?? room.refs[slotId] ?? null) : null;
            if (!player) {
              return (
                <div
                  key={`empty-${index}`}
                  className="flex items-center gap-3 rounded-xl border-2 border-dashed border-(--pc-border) bg-(--pc-paper) px-3 py-2.5"
                >
                  <span className="h-8 w-1.5 rounded-full bg-(--pc-border)" aria-hidden />
                  <span className="text-sm text-(--pc-faint)">[ 空位 ]</span>
                </div>
              );
            }
            return (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-3 py-2.5 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]"
              >
                <button
                  type="button"
                  onClick={() => toggleTeam(player)}
                  title={player.team === "none" ? "未分队" : "点击换边"}
                  className={cn(
                    "h-8 w-1.5 shrink-0 rounded-full",
                    teamBarClass(player.team),
                    player.team !== "none" && "cursor-pointer",
                  )}
                  aria-label="切换队伍"
                />
                <UserAvatar
                  username={player.user?.username}
                  avatarUrl={player.user?.avatar_url}
                  osuId={player.user?.id ?? player.id}
                  className="h-8 w-8 shrink-0"
                  fallbackClassName="bg-pc-yellow/30 font-bold text-(--pc-ink)"
                  uppercase
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-(--pc-ink)">
                      {displayName(player.user, player.id)}
                    </span>
                    {statusBadge(player.status)}
                  </div>
                  <div className="text-xs text-(--pc-faint)">
                    mods：{modsText(player.mods) || "无"}
                  </div>
                </div>

                {room.type === "team_versus" && player.status !== "referee" && (
                  <div className="flex items-center gap-1">
                    {(["red", "blue"] as const).map((team) => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => void moveToTeam(player, team)}
                        aria-label={team === "red" ? "分到红队" : "分到蓝队"}
                        className={cn(
                          "h-6 rounded-md border-2 px-1.5 text-[10px] font-bold transition-colors",
                          player.team === team
                            ? team === "red"
                              ? "border-pc-primary bg-pc-primary/15 text-pc-primary"
                              : "border-pc-blue bg-pc-blue/15 text-pc-blue"
                            : "border-(--pc-border) text-(--pc-faint) hover:bg-(--pc-paper)",
                        )}
                      >
                        {team === "red" ? "红" : "蓝"}
                      </button>
                    ))}
                  </div>
                )}

                {player.status !== "referee" && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => kick(player)}
                      title="踢出该玩家"
                      aria-label={`踢出 ${displayName(player.user, player.id)}`}
                    >
                      <UserRoundX className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => ban(player)}
                      title="封禁该玩家"
                      aria-label={`封禁 ${displayName(player.user, player.id)}`}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {room.playerSlots.length === 0 && (
            <p className="py-6 text-center text-sm text-(--pc-faint)">暂无玩家</p>
          )}
        </div>
      </CardContent>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀请玩家</DialogTitle>
            <DialogDescription>
              输入 osu! 用户名或 ID（也支持 #123456 写法），可以连续邀请多人。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="ref-invite-player-id">用户名 / 用户 ID</Label>
            <Input
              id="ref-invite-player-id"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitInvite();
              }}
              placeholder="例如 MogenNotFound 或 123456"
            />
          </div>
          {invited.length > 0 && (
            <p className="text-xs text-(--pc-faint)">本次已邀请：{invited.join("、")}</p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
              关闭
            </Button>
            <BusyButton
              size="sm"
              onClick={() => void submitInvite()}
              loading={inviteBusy}
              icon={<Search className="h-3.5 w-3.5" />}
            >
              邀请
            </BusyButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
