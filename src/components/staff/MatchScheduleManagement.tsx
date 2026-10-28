import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api, qs } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
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
import type { MatchRoom, MatchSchedule, PlayerStub } from "@/lib/types";
import { useCurrentSeason, useSeasonOptions } from "@/lib/seasons";
import SeasonSelect from "@/components/staff/SeasonSelect";

const STATUS_META: Record<string, { label: string; variant: "primary" | "teal" | "yellow" | "blue" | "outline" }> = {
  pending: { label: "待确认", variant: "yellow" },
  confirmed: { label: "已确认", variant: "teal" },
  completed: { label: "已完成", variant: "blue" },
  cancelled: { label: "已取消", variant: "outline" },
};

function statusVariant(s: string): "primary" | "teal" | "yellow" | "blue" | "outline" {
  return STATUS_META[s]?.variant ?? "outline";
}

function statusLabel(s: string): string {
  return STATUS_META[s]?.label ?? s;
}

/** 后端把本地墙钟时间按 UTC 序列化（+00:00），直接取墙钟部分显示 */
function wallClock(iso?: string | null): string {
  if (!iso) return "—";
  const naive = iso.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const [datePart, timePart = ""] = naive.split("T");
  return timePart ? `${datePart} ${timePart.slice(0, 5)}` : datePart;
}

/** 赛程所属赛季：自身没有时跟随房间 */
const seasonOfSchedule = (s: MatchSchedule) => (s.season ?? s.room?.season ?? "").toLowerCase();

interface EditForm {
  red: string;
  blue: string;
  season: string;
  link: string;
  stream: string;
  replay: string;
  status: string;
}

const EMPTY_EDIT: EditForm = {
  red: "",
  blue: "",
  season: "",
  link: "",
  stream: "",
  replay: "",
  status: "pending",
};

export default function MatchScheduleManagement() {
  const { data, loading, error, load } = useFetch<MatchSchedule[]>(() => api.get("/api/schedules"));
  const rooms = useFetch<MatchRoom[]>(() => api.get("/api/rooms"));
  const players = useFetch<PlayerStub[]>(() =>
    api.get("/api/players" + qs({ status: "approved" })),
  );
  const currentSeason = useCurrentSeason();
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);
  const activeSeason = seasonFilter ?? currentSeason;
  const seasonOptions = useSeasonOptions([
    ...(data ?? []).map((s) => s.season ?? s.room?.season),
    ...(rooms.data ?? []).map((r) => r.season),
  ]);

  /** 列表按赛季过滤（赛程自身没标赛季时用房间的赛季兜底），晚的在前 */
  const schedules = useMemo(
    () =>
      (data ?? [])
        .filter((s) => activeSeason === "all" || seasonOfSchedule(s) === activeSeason)
        .sort((a, b) => (b.room?.matchTime ?? "").localeCompare(a.room?.matchTime ?? "")),
    [data, activeSeason],
  );

  /** 创建赛程时只列出当前筛选赛季的房间 */
  const roomChoices = useMemo(() => {
    const list = rooms.data ?? [];
    if (activeSeason === "all") return list;
    return list.filter((r) => (r.season ?? "").toLowerCase() === activeSeason);
  }, [rooms.data, activeSeason]);

  const [createOpen, setCreateOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [r1, setR1] = useState("");
  const [r2, setR2] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const [editTarget, setEditTarget] = useState<MatchSchedule | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);

  const playerList = players.data ?? [];

  const create = async () => {
    if (!roomId || !r1 || !r2 || r1 === r2) {
      toast({ title: "请选择房间与两名不同选手" });
      return;
    }
    setCreateBusy(true);
    const a = playerList.find((p) => p.osuId === r1);
    const b = playerList.find((p) => p.osuId === r2);
    const res = await api.post("/api/schedules", {
      is_admin_create: true,
      roomId: Number(roomId),
      player1_osuId: r1,
      player1_username: a?.username ?? "",
      player2_osuId: r2,
      player2_username: b?.username ?? "",
    });
    setCreateBusy(false);
    if (res.ok) {
      toast({ title: "赛程已创建" });
      setCreateOpen(false);
      setRoomId("");
      setR1("");
      setR2("");
      void load();
    } else {
      toast({ variant: "destructive", title: res.error.message || "创建失败" });
    }
  };

  const openEdit = (s: MatchSchedule) => {
    setEditTarget(s);
    setEditForm({
      red: s.redScore != null ? String(s.redScore) : "",
      blue: s.blueScore != null ? String(s.blueScore) : "",
      season: (s.season ?? s.room?.season ?? "").toLowerCase(),
      link: s.matchLink ?? "",
      stream: s.streamLink ?? "",
      replay: s.replayLink ?? "",
      status: s.status,
    });
  };

  const setEdit = (k: keyof EditForm, v: string) => setEditForm((f) => ({ ...f, [k]: v }));

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    const body = {
      season: editForm.season || undefined,
      clearSeason: !editForm.season,
      red_score: editForm.red === "" ? null : Number(editForm.red),
      blue_score: editForm.blue === "" ? null : Number(editForm.blue),
      match_link: editForm.link || null,
      stream_link: editForm.stream || null,
      replay_link: editForm.replay || null,
    };
    const res = await api.patch(`/api/schedules/${editTarget.id}/details`, body);
    let ok = res.ok;
    // 状态走独立接口，保证旧后端也能生效
    if (ok && editForm.status !== editTarget.status) {
      const r = await api.patch(`/api/schedules/${editTarget.id}`, { status: editForm.status });
      ok = r.ok;
    }
    setSaving(false);
    if (ok) {
      toast({ title: "赛程已更新" });
      setEditTarget(null);
      void load();
    } else {
      toast({ variant: "destructive", title: !res.ok ? res.error.message : "状态更新失败" });
    }
  };

  if (loading) return <LoadingBlock label="加载赛程中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle tag="比赛预约管理" accent="var(--pc-primary)" className="mb-0">
          赛程安排
        </SectionTitle>
        <div className="flex items-center gap-2">
          <SeasonSelect
            value={activeSeason}
            onChange={(v) => setSeasonFilter(v)}
            options={seasonOptions}
            includeAll
            className="w-36"
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="primary">创建赛程</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建赛程</DialogTitle>
                <DialogDescription>选择房间与两名选手。</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>房间</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择房间" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomChoices.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.roomName}
                          {r.season ? ` · ${r.season.toUpperCase()}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>选手一（红方）</Label>
                  <Select value={r1} onValueChange={setR1}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择选手一" />
                    </SelectTrigger>
                    <SelectContent>
                      {playerList.map((p) => (
                        <SelectItem key={p.osuId} value={p.osuId}>
                          {p.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>选手二（蓝方）</Label>
                  <Select value={r2} onValueChange={setR2}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择选手二" />
                    </SelectTrigger>
                    <SelectContent>
                      {playerList.map((p) => (
                        <SelectItem key={p.osuId} value={p.osuId}>
                          {p.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">取消</Button>
                </DialogClose>
                <Button variant="primary" onClick={create} disabled={createBusy}>
                  {createBusy ? "创建中…" : "创建"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {schedules.length === 0 ? (
        <p className="py-10 text-center text-sm text-(--pc-faint)">
          {activeSeason === "all" ? "还没有赛程。" : "当前赛季还没有赛程。"}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-(--pc-border) bg-(--pc-paper) text-xs text-(--pc-slate)">
                <th className="whitespace-nowrap px-4 py-3 font-bold">时间</th>
                <th className="px-4 py-3 font-bold">房间</th>
                <th className="px-4 py-3 font-bold">对阵</th>
                <th className="whitespace-nowrap px-4 py-3 font-bold">比分</th>
                <th className="whitespace-nowrap px-4 py-3 font-bold">赛季</th>
                <th className="whitespace-nowrap px-4 py-3 font-bold">状态</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => {
                const room = s.room ?? null;
                const hasScore = s.redScore != null && s.blueScore != null;
                return (
                  <tr
                    key={s.id}
                    className="border-b border-(--pc-border)/60 last:border-0 hover:bg-(--pc-paper)"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-sans text-(--pc-slate)">
                      {wallClock(room?.matchTime ?? room?.matchDate)}
                    </td>
                    <td className="px-4 py-3 text-(--pc-ink)">{room?.roomName || "未分配房间"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          hasScore && s.redScore! > s.blueScore!
                            ? "font-bold text-pc-primary"
                            : "text-pc-primary"
                        }
                      >
                        {s.player1Username || "?"}
                      </span>
                      <span className="mx-1.5 text-xs text-(--pc-faint)">vs</span>
                      <span
                        className={
                          hasScore && s.blueScore! > s.redScore!
                            ? "font-bold text-pc-blue"
                            : "text-pc-blue"
                        }
                      >
                        {s.player2Username || "?"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-sans font-bold text-(--pc-ink)">
                      {hasScore ? `${s.redScore} : ${s.blueScore}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {s.season ? (
                        <Badge variant="outline">{s.season.toUpperCase()}</Badge>
                      ) : (
                        <span className="text-xs text-(--pc-faint)">未标注</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        编辑
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 编辑赛程 */}
      <Dialog open={editTarget !== null} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget?.player1Username || "?"} vs {editTarget?.player2Username || "?"}
            </DialogTitle>
            <DialogDescription>
              房间：{editTarget?.room?.roomName || "未分配"} · 时间：
              {wallClock(editTarget?.room?.matchTime ?? editTarget?.room?.matchDate)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>红方比分</Label>
                <Input
                  type="number"
                  value={editForm.red}
                  onChange={(e) => setEdit("red", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>蓝方比分</Label>
                <Input
                  type="number"
                  value={editForm.blue}
                  onChange={(e) => setEdit("blue", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>赛季</Label>
                {editForm.season && (
                  <button
                    type="button"
                    className="text-xs text-(--pc-faint) underline-offset-2 hover:text-pc-primary hover:underline"
                    onClick={() => setEdit("season", "")}
                  >
                    清除
                  </button>
                )}
              </div>
              <SeasonSelect
                value={editForm.season}
                onChange={(v) => setEdit("season", v)}
                options={seasonOptions}
                placeholder="未标注"
                className="w-full"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>比赛链接</Label>
              <Input
                value={editForm.link}
                onChange={(e) => setEdit("link", e.target.value)}
                placeholder="https://osu.ppy.sh/multiplayer/rooms/.../events"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>直播链接</Label>
              <Input
                value={editForm.stream}
                onChange={(e) => setEdit("stream", e.target.value)}
                placeholder="直播地址（可选）"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>回放链接</Label>
              <Input
                value={editForm.replay}
                onChange={(e) => setEdit("replay", e.target.value)}
                placeholder="回放地址（可选）"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>状态</Label>
              <Select value={editForm.status} onValueChange={(v) => setEdit("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待确认</SelectItem>
                  <SelectItem value="confirmed">已确认</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button variant="primary" onClick={() => void saveEdit()} disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
