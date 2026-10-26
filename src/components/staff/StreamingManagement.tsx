import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatWallClock } from "@/lib/utils";
import { SectionTitle } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import type { MatchRoom, StaffRoomAssignment, StaffRole } from "@/lib/types";

const ROLE_LABEL: Record<StaffRole, string> = {
  referee: "裁判",
  commentator: "解说",
  streamer: "主播",
};

const ROLE_META: Record<StaffRole, { variant: "primary" | "teal" | "yellow" | "blue" | "outline" }> = {
  referee: { variant: "teal" },
  commentator: { variant: "yellow" },
  streamer: { variant: "blue" },
};

// 比赛时间：日期取 matchDate、时间取 matchTime，按 +8 墙钟展示
function roomSchedule(room: MatchRoom): string {
  const naive = (iso?: string | null) =>
    (iso ?? "").replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const datePart = naive(room.matchDate).slice(0, 10) || naive(room.matchTime).slice(0, 10);
  const timePart = naive(room.matchTime).slice(11, 16) || "00:00";
  return formatWallClock(`${datePart}T${timePart}:00+00:00`);
}

export default function StreamingManagement() {
  const { user } = useApp();
  const rooms = useFetch<MatchRoom[]>(() => api.get("/api/rooms"));
  const assignments = useFetch<StaffRoomAssignment[]>(() =>
    api.get("/api/staff/assignments"),
  );

  const [applyOpen, setApplyOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [role, setRole] = useState<StaffRole>("referee");
  const [staffOsuId, setStaffOsuId] = useState(user?.osuId ?? "");
  const [staffUsername, setStaffUsername] = useState(user?.username ?? "");
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);

  const list = assignments.data ?? [];
  // 用户信息晚于挂载到达时补全默认值（不覆盖用户已填写的内容）
  useEffect(() => {
    if (!user) return;
    setStaffOsuId((v) => v || user.osuId);
    setStaffUsername((v) => v || user.username);
  }, [user]);

  const refetch = () => {
    void rooms.load();
    void assignments.load();
  };

  // 按房间聚合安排，避免每渲染一次就全量过滤
  const counts = useMemo(() => {
    const byRoom = new Map<number, StaffRoomAssignment[]>();
    for (const a of assignments.data ?? []) {
      const arr = byRoom.get(a.roomId) ?? [];
      arr.push(a);
      byRoom.set(a.roomId, arr);
    }
    return (rooms.data ?? []).map((room) => {
      const inRoom = byRoom.get(room.id) ?? [];
      return {
        room,
        referee: inRoom.filter((a) => a.role === "referee").length,
        commentator: inRoom.filter((a) => a.role === "commentator").length,
        streamer: inRoom.filter((a) => a.role === "streamer").length,
      };
    });
  }, [rooms.data, assignments.data]);

  const apply = async () => {
    if (!roomId || !staffOsuId || !staffUsername) {
      toast({ title: "请填写完整信息" });
      return;
    }
    setBusy(true);
    const res = await api.post("/api/staff/assignments", {
      roomId: Number(roomId),
      staffOsuId,
      staffUsername,
      staffRole: role,
    });
    setBusy(false);
    if (res.ok) {
      toast({ title: "已申请加入房间" });
      setApplyOpen(false);
      refetch();
    } else {
      toast({ variant: "destructive", title: "申请失败" });
    }
  };

  const revoke = async (id: number) => {
    setRevoking(id);
    const res = await api.delete(`/api/staff/assignments/${id}`);
    setRevoking(null);
    if (res.ok) {
      toast({ title: "已撤销安排" });
      refetch();
    } else {
      toast({ variant: "destructive", title: "撤销失败" });
    }
  };

  const remaining = list.filter((a) => !rooms.data?.some((r) => r.id === a.roomId));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle tag="房间加入" accent="var(--pc-primary)" className="mb-0">
          主播 / 解说 / 裁判安排
        </SectionTitle>
        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogTrigger asChild>
            <Button variant="primary">申请加入房间</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>申请加入房间</DialogTitle>
              <DialogDescription>选择房间与职位角色（osuId 需为管理员）。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>房间</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择房间" />
                  </SelectTrigger>
                  <SelectContent>
                    {(rooms.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.roomName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>角色</Label>
                <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referee">裁判</SelectItem>
                    <SelectItem value="commentator">解说</SelectItem>
                    <SelectItem value="streamer">主播</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>osuId</Label>
                  <Input value={staffOsuId} onChange={(e) => setStaffOsuId(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>用户名</Label>
                  <Input value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button variant="primary" onClick={apply} disabled={busy}>
                {busy ? "提交中…" : "提交"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rooms.loading || assignments.loading ? (
        <LoadingBlock label="加载房间与安排中…" />
      ) : rooms.error || assignments.error ? (
        <ErrorBlock
          message={rooms.error || assignments.error || "加载失败"}
          onRetry={refetch}
        />
      ) : (
        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {counts?.map(({ room, referee, commentator, streamer }) => (
              <Card key={room.id} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-(--pc-ink)">{room.roomName}</p>
                  <Badge variant={room.status === "full" ? "primary" : "teal"}>{room.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-(--pc-faint)">
                  R{room.roundNumber} · {roomSchedule(room)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="teal">裁判 {referee}</Badge>
                  <Badge variant="yellow">解说 {commentator}</Badge>
                  <Badge variant="blue">主播 {streamer}</Badge>
                </div>
              </Card>
            ))}
          </div>

          <SectionTitle tag="当前安排" accent="var(--pc-teal)" className="mt-8 mb-0">
            人员安排列表
          </SectionTitle>
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-(--pc-faint)">暂无安排。</p>
          ) : (
            <div className="mt-4 space-y-3">
              {list.map((a) => {
                const rm = a.room;
                return (
                  <Card key={a.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={ROLE_META[a.role as StaffRole]?.variant ?? "outline"}>
                        {ROLE_LABEL[a.role as StaffRole] ?? a.role}
                      </Badge>
                      <div>
                        <p className="font-bold text-(--pc-ink)">{a.staffUsername}</p>
                        <p className="text-xs text-(--pc-faint)">osuId: {a.staffOsuId}</p>
                      </div>
                      <span className="text-sm text-(--pc-slate)">· {rm?.roomName ?? "-"}</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void revoke(a.id)}
                      disabled={revoking === a.id}
                    >
                      {revoking === a.id ? "…" : "撤销"}
                    </Button>
                  </Card>
                );
              })}
              {remaining.length > 0 && (
                <p className="text-xs text-(--pc-faint)">
                  {remaining.length} 条安排与现存房间不匹配（房间可能已删除）。
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}