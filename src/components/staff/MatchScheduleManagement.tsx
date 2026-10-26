import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api, qs } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

interface RowForm {
  season: string;
  red: string;
  blue: string;
  link: string;
  stream: string;
  replay: string;
}

interface ScheduleCardProps {
  s: MatchSchedule;
  form: RowForm;
  busy: boolean;
  onForm: (f: RowForm) => void;
  onSaveDetails: () => void;
  onStatus: (status: string) => void;
}

function ScheduleCard({ s, form, busy, onForm, onSaveDetails, onStatus }: ScheduleCardProps) {
  const setField = (k: keyof RowForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onForm({ ...form, [k]: e.target.value });

  const roomName = s.room?.roomName;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold text-(--pc-ink)">
          {s.player1Username || "?"} <span className="text-(--pc-faint)">vs</span>{" "}
          {s.player2Username || "?"}
        </p>
        <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
      </div>
      {roomName && <p className="mt-1 text-xs text-(--pc-faint)">房间：{roomName}</p>}
      <p className="mt-1 text-xs text-(--pc-faint)">
        赛季：{s.season ? s.season.toUpperCase() : "未标注"}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-(--pc-slate)">红方比分</Label>
          <Input
            type="number"
            value={form.red}
            onChange={setField("red")}
            placeholder={s.redScore != null ? String(s.redScore) : "0"}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-(--pc-slate)">蓝方比分</Label>
          <Input
            type="number"
            value={form.blue}
            onChange={setField("blue")}
            placeholder={s.blueScore != null ? String(s.blueScore) : "0"}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-1.5">
        <Label className="text-xs text-(--pc-slate)">赛季</Label>
        <Input
          value={form.season}
          onChange={setField("season")}
          placeholder={s.season || "如 s2"}
        />
      </div>

      <div className="mt-3 space-y-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-(--pc-slate)">比赛链接</Label>
          <Input value={form.link} onChange={setField("link")} placeholder={s.matchLink || "mech.ink"} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-(--pc-slate)">直播链接</Label>
          <Input value={form.stream} onChange={setField("stream")} placeholder={s.streamLink || "bilibili"} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-(--pc-slate)">回放链接</Label>
          <Input value={form.replay} onChange={setField("replay")} placeholder={s.replayLink || "可选"} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={s.status} onValueChange={onStatus}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">待确认</SelectItem>
            <SelectItem value="confirmed">已确认</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="primary"
          size="sm"
          className="ml-auto"
          onClick={onSaveDetails}
          disabled={busy}
        >
          保存
        </Button>
      </div>
    </Card>
  );
}

export default function MatchScheduleManagement() {
  const { data, loading, error, load } = useFetch<MatchSchedule[]>(() => api.get("/api/schedules"));
  const rooms = useFetch<MatchRoom[]>(() => api.get("/api/rooms"));
  const players = useFetch<PlayerStub[]>(() =>
    api.get("/api/players" + qs({ status: "approved" })),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [r1, setR1] = useState("");
  const [r2, setR2] = useState("");
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [forms, setForms] = useState<Record<number, RowForm>>({});

  // 每个操作使用独立 key，避免一个操作完成时清掉另一个进行中的忙碌标记
  const markBusy = (key: string, on: boolean) =>
    setBusyKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const playerList = players.data ?? [];

  const rowForm = (s: MatchSchedule): RowForm =>
    forms[s.id] ?? {
      season: "",
      red: "",
      blue: "",
      link: "",
      stream: "",
      replay: "",
    };

  const setRowForm = (s: MatchSchedule, f: RowForm) =>
    setForms((m) => ({ ...m, [s.id]: f }));

  const create = async () => {
    if (!roomId || !r1 || !r2 || r1 === r2) {
      toast({ title: "请选择房间与两名不同选手" });
      return;
    }
    markBusy("create", true);
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
    markBusy("create", false);
    if (res.ok) {
      toast({ title: "赛程已创建" });
      setCreateOpen(false);
      setRoomId("");
      setR1("");
      setR2("");
      void load();
    } else {
      toast({ variant: "destructive", title: "创建失败" });
    }
  };

  const saveDetails = async (s: MatchSchedule) => {
    const f = rowForm(s);
    const body: Record<string, string | number | null> = {
      season: f.season === "" ? (s.season ?? null) : f.season,
      red_score: f.red === "" ? null : Number(f.red),
      blue_score: f.blue === "" ? null : Number(f.blue),
      match_link: f.link === "" ? (s.matchLink ?? null) : f.link,
      stream_link: f.stream === "" ? (s.streamLink ?? null) : f.stream,
      replay_link: f.replay === "" ? (s.replayLink ?? null) : f.replay,
    };
    markBusy(`details-${s.id}`, true);
    const res = await api.patch(`/api/schedules/${s.id}/details`, body);
    markBusy(`details-${s.id}`, false);
    if (res.ok) {
      setForms((m) => ({
        ...m,
        [s.id]: { season: "", red: "", blue: "", link: "", stream: "", replay: "" },
      }));
      toast({ title: "保存成功" });
      void load();
    } else {
      toast({ variant: "destructive", title: "保存失败" });
    }
  };

  const updateStatus = async (s: MatchSchedule, status: string) => {
    markBusy(`status-${s.id}`, true);
    const res = await api.patch(`/api/schedules/${s.id}`, { status });
    markBusy(`status-${s.id}`, false);
    if (res.ok) {
      toast({ title: "状态已更新" });
      void load();
    } else {
      toast({ variant: "destructive", title: "状态更新失败" });
    }
  };

  if (loading) return <LoadingBlock label="加载赛程中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  // Group by room
  const grouped = data.reduce<Record<string, MatchSchedule[]>>((acc, s) => {
    const key = s.room?.roomName || "未分配房间";
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle tag="比赛预约管理" accent="var(--pc-primary)" className="mb-0">
          赛程安排
        </SectionTitle>
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
                    {(rooms.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.roomName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>选手一</Label>
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
                <Label>选手二</Label>
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
              <Button variant="primary" onClick={create} disabled={busyKeys.has("create")}>
                {busyKeys.has("create") ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-(--pc-faint)">还没有赛程。</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([room, list]) => (
            <div key={room}>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-(--pc-ink)">
                {room}
                <Badge variant="outline">{list.length}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {list.map((s) => (
                  <ScheduleCard
                    key={s.id}
                    s={s}
                    form={rowForm(s)}
                    busy={busyKeys.has(`details-${s.id}`)}
                    onForm={(f) => setRowForm(s, f)}
                    onSaveDetails={() => void saveDetails(s)}
                    onStatus={(st) => void updateStatus(s, st)}
                  />
                ))}
              </div>
              <Separator className="mt-6" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
