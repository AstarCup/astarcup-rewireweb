import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { useCurrentSeason, useSeasonOptions } from "@/lib/seasons";
import SeasonSelect from "@/components/staff/SeasonSelect";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api, qs } from "@/lib/api";
import { stageLabelOf } from "@/lib/rooms";
import { formatWallClock, cn, osuAvatarUrl } from "@/lib/utils";
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

/** 职位展示顺序 */
const ROLE_ORDER: StaffRole[] = ["referee", "commentator", "streamer"];

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
  // 带赛程返回，用于只展示「已有玩家预约」的房间
  const rooms = useFetch<MatchRoom[]>(() =>
    api.get("/api/rooms" + qs({ withSchedules: true })),
  );
  const assignments = useFetch<StaffRoomAssignment[]>(() =>
    api.get("/api/staff/assignments"),
  );
  const currentSeason = useCurrentSeason();
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);
  const activeSeason = seasonFilter ?? currentSeason;
  const seasonOptions = useSeasonOptions((rooms.data ?? []).map((r) => r.season));
  /** 只展示当前赛季、且已经有玩家预约（存在赛程）的房间 */
  const seasonRooms = useMemo(
    () =>
      (rooms.data ?? []).filter(
        (r) =>
          (activeSeason === "all" || (r.season ?? "").toLowerCase() === activeSeason) &&
          (r.schedules?.length ?? 0) > 0,
      ),
    [rooms.data, activeSeason],
  );

  const [applyOpen, setApplyOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [role, setRole] = useState<StaffRole>("referee");
  const [staffOsuId, setStaffOsuId] = useState(user?.osuId ?? "");
  const [staffUsername, setStaffUsername] = useState(user?.username ?? "");
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [roleBusy, setRoleBusy] = useState<string | null>(null);

  /** 人员安排列表同样按赛季过滤（安排挂在房间上，用房间赛季判断） */
  const list = useMemo(
    () =>
      (assignments.data ?? []).filter(
        (a) =>
          activeSeason === "all" ||
          (a.room?.season ?? "").toLowerCase() === activeSeason,
      ),
    [assignments.data, activeSeason],
  );
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

  // 按房间聚合安排：房间卡片上的职位按钮与已加入名单都从这里取
  const byRoom = useMemo(() => {
    const map = new Map<number, StaffRoomAssignment[]>();
    for (const a of assignments.data ?? []) {
      const arr = map.get(a.roomId) ?? [];
      arr.push(a);
      map.set(a.roomId, arr);
    }
    return map;
  }, [assignments.data]);

  /** 点职位 = 加入，再点 = 取消 */
  const toggleRole = async (room: MatchRoom, targetRole: StaffRole) => {
    if (!user) {
      toast({ variant: "destructive", title: "请先登录" });
      return;
    }
    const key = `${room.id}-${targetRole}`;
    if (roleBusy === key) return;
    const mine = (byRoom.get(room.id) ?? []).find(
      (a) => a.staffOsuId === user.osuId && a.role === targetRole,
    );
    setRoleBusy(key);
    const res = mine
      ? await api.delete(`/api/staff/assignments/${mine.id}`)
      : await api.post("/api/staff/assignments", {
          roomId: room.id,
          staffOsuId: user.osuId,
          staffUsername: user.username,
          staffRole: targetRole,
        });
    setRoleBusy(null);
    if (res.ok) {
      toast({ title: mine ? `已取消${ROLE_LABEL[targetRole]}` : `已加入${ROLE_LABEL[targetRole]}` });
      void assignments.load();
    } else {
      toast({ variant: "destructive", title: res.error.message || "操作失败" });
    }
  };

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

  const remaining = (assignments.data ?? []).filter(
    (a) => !rooms.data?.some((r) => r.id === a.roomId),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle tag="房间加入" accent="var(--pc-primary)" className="mb-0">
          主播 / 解说 / 裁判安排
        </SectionTitle>
        <div className="flex items-center gap-2">
        <SeasonSelect
          value={activeSeason}
          onChange={(v) => setSeasonFilter(v)}
          options={seasonOptions}
          includeAll
          className="w-36"
        />
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
                    {seasonRooms.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.roomName}
                        {r.season ? ` · ${r.season.toUpperCase()}` : ""}
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
          {seasonRooms.length === 0 && (
            <p className="rounded-2xl bg-(--pc-white) p-6 text-center text-sm text-(--pc-faint) shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
              {activeSeason === "all"
                ? "还没有玩家预约的房间。"
                : "当前赛季还没有玩家预约的房间。"}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {seasonRooms.map((room) => {
              const people = byRoom.get(room.id) ?? [];
              return (
                <Card key={room.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-(--pc-ink)">{room.roomName}</p>
                    <Badge variant={room.status === "full" ? "primary" : "teal"}>
                      {room.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-(--pc-faint)">
                    {stageLabelOf(room)} · {roomSchedule(room)}
                  </p>

                  {/* 房间里的对阵（头像 + 双方名字） */}
                  {(room.schedules ?? []).length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {(room.schedules ?? []).map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-1.5 text-sm">
                          <img
                            src={osuAvatarUrl(s.player1OsuId)}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                          <span className="font-bold text-pc-primary">
                            {s.player1Username || "?"}
                          </span>
                          <span className="text-xs text-(--pc-faint)">vs</span>
                          <span className="font-bold text-pc-blue">
                            {s.player2Username || "?"}
                          </span>
                          <img
                            src={osuAvatarUrl(s.player2OsuId)}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 职位按钮：点一下加入，再点一下取消 */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {ROLE_ORDER.map((r) => {
                      const count = people.filter((a) => a.role === r).length;
                      const mine = people.some(
                        (a) => a.role === r && a.staffOsuId === user?.osuId,
                      );
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => void toggleRole(room, r)}
                          disabled={roleBusy === `${room.id}-${r}`}
                          title={mine ? "点击取消加入" : `点击加入${ROLE_LABEL[r]}`}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold transition-all duration-150",
                            mine
                              ? "border-pc-teal bg-pc-teal text-pc-cream"
                              : "border-(--pc-border) bg-(--pc-white) text-(--pc-slate) hover:-translate-y-0.5 hover:border-pc-teal hover:text-pc-teal",
                            roleBusy === `${room.id}-${r}` && "opacity-60",
                          )}
                        >
                          {ROLE_LABEL[r]} {count}
                          {mine && <span className="text-[10px]">已加入 ✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* 已加入的人：头像 + 名字 + 职位 */}
                  {people.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {people.map((a) => (
                        <span
                          key={a.id}
                          className="flex items-center gap-1.5 rounded-full border border-(--pc-border) bg-(--pc-paper) py-0.5 pl-0.5 pr-2 text-xs"
                        >
                          <img
                            src={osuAvatarUrl(a.staffOsuId)}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                          <span className="font-bold text-(--pc-ink)">{a.staffUsername}</span>
                          <span className="text-(--pc-faint)">
                            {ROLE_LABEL[a.role as StaffRole] ?? a.role}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-(--pc-faint)">暂无人加入，点上面的职位即可加入</p>
                  )}
                </Card>
              );
            })}
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