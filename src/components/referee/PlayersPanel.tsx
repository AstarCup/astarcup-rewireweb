import { useState } from "react";
import { Loader2, Lock, LockOpen, UserPlus, UserRoundX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  displayName,
  hub,
  invokeHub,
  modsText,
  type RefRoomState,
  type RefUser,
  type RefUserStatus,
} from "@/lib/ref";
import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/ui/badge";
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
  return (
    <Badge variant={meta?.variant ?? "outline"}>{meta?.label ?? status ?? "—"}</Badge>
  );
}

function teamBarClass(team: RefUser["team"]) {
  if (team === "red") return "bg-pc-primary";
  if (team === "blue") return "bg-pc-blue";
  return "bg-(--pc-border)";
}

interface PlayersPanelProps {
  room: RefRoomState;
}

/** 左栏上半：玩家槽位列表（队伍色条 / 状态徽章 / mods / Kick）+ 邀请 + 锁位 */
export default function PlayersPanel({ room }: PlayersPanelProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  const toggleLock = async () => {
    setLockBusy(true);
    const res = await invokeHub(hub.setLockState(room.id, !room.locked));
    setLockBusy(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "修改锁位失败", description: res.error.message });
    }
  };

  const submitInvite = async () => {
    const userId = Number(inviteUserId.trim());
    if (!Number.isFinite(userId) || userId <= 0) {
      toast({ variant: "destructive", title: "请输入有效的用户 ID" });
      return;
    }
    setInviteBusy(true);
    const res = await invokeHub(hub.invitePlayer(room.id, userId));
    setInviteBusy(false);
    if (res.ok) {
      toast({ title: "已发送邀请", description: `用户 #${userId}` });
      setInviteOpen(false);
      setInviteUserId("");
    } else {
      toast({ variant: "destructive", title: "邀请失败", description: res.error.message });
    }
  };

  const kick = async (player: RefUser) => {
    const name = displayName(player.user, player.id);
    if (!window.confirm(`确定要踢出 ${name} 吗？`)) return;
    const res = await invokeHub(hub.kickPlayer(room.id, player.id));
    if (!res.ok) {
      toast({ variant: "destructive", title: "踢出失败", description: res.error.message });
    }
  };

  const toggleTeam = async (player: RefUser) => {
    if (player.team === "none") return;
    const team = player.team === "red" ? "blue" : "red";
    const res = await invokeHub(hub.moveUserToTeam(room.id, player.id, team));
    if (!res.ok) {
      toast({ variant: "destructive", title: "换边失败", description: res.error.message });
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base md:text-lg">玩家</CardTitle>
        <div className="flex items-center gap-2">
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
                    "h-8 w-1.5 rounded-full",
                    teamBarClass(player.team),
                    player.team !== "none" && "cursor-pointer",
                  )}
                  aria-label="切换队伍"
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
                {player.status !== "referee" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => kick(player)}
                    title="踢出该玩家"
                  >
                    <UserRoundX className="h-3.5 w-3.5" /> 踢出
                  </Button>
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
            <DialogDescription>输入对方的 osu! 用户 ID（数字）邀请加入房间。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="ref-invite-player-id">用户 ID</Label>
            <Input
              id="ref-invite-player-id"
              type="number"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              placeholder="例如 123456"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={submitInvite} disabled={inviteBusy}>
              {inviteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              邀请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
