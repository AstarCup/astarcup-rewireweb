import { useState } from "react";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDate } from "@/lib/utils";
import type { MatchRoom } from "@/lib/types";

const EMPTY_FORM = {
  room_name: "",
  round_number: "",
  match_date: "",
  match_time: "",
  match_number: "",
  max_participants: "",
  description: "",
};

export default function RoomManagement() {
  const { data, loading, error, load } = useFetch<MatchRoom[]>(() => api.get("/api/rooms"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<MatchRoom | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const statusVariant = (s: string) =>
    s === "full"
      ? "primary"
      : s === "closed"
        ? "outline"
        : "teal";

  const createRoom = async () => {
    setBusy(true);
    setMsg("");
    const res = await api.post("/api/rooms", {
      room_name: form.room_name,
      round_number: form.round_number ? Number(form.round_number) : 1,
      match_date: form.match_date || null,
      match_time: form.match_time || null,
      match_number: form.match_number ? Number(form.match_number) : 1,
      max_participants: form.max_participants ? Number(form.max_participants) : 0,
      description: form.description || null,
    });
    setBusy(false);
    if (res.ok) {
      setMsg("房间已创建");
      setOpen(false);
      setForm(EMPTY_FORM);
      void load();
    } else {
      setMsg("创建失败");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDelBusy(true);
    const res = await api.delete(`/api/rooms/${deleteTarget.id}`);
    setDelBusy(false);
    setDeleteTarget(null);
    if (res.ok) {
      setMsg("房间已删除");
      void load();
    } else {
      setMsg("删除失败");
    }
  };

  if (loading) return <LoadingBlock label="加载房间中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle tag="房间管理" accent="#5cb8a5" className="mb-0">
          比赛房间
        </SectionTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="primary">新建房间</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建房间</DialogTitle>
              <DialogDescription>填写房间信息后点击创建。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>房间名称</Label>
                <Input value={form.room_name} onChange={setField("room_name")} placeholder="如：32强 · 1 号房" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>轮次</Label>
                  <Input value={form.round_number} onChange={setField("round_number")} />
                </div>
                <div className="grid gap-1.5">
                  <Label>场次</Label>
                  <Input value={form.match_number} onChange={setField("match_number")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>日期</Label>
                  <Input type="date" value={form.match_date} onChange={setField("match_date")} />
                </div>
                <div className="grid gap-1.5">
                  <Label>时间</Label>
                  <Input type="time" value={form.match_time} onChange={setField("match_time")} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>最大人数</Label>
                <Input type="number" value={form.max_participants} onChange={setField("max_participants")} />
              </div>
              <div className="grid gap-1.5">
                <Label>描述</Label>
                <Input value={form.description} onChange={setField("description")} placeholder="可选" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button variant="primary" onClick={createRoom} disabled={busy}>
                {busy ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {msg && (
        <Badge variant={msg.includes("失败") ? "primary" : "teal"} className="mb-4">
          {msg}
        </Badge>
      )}

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#b0a898]">还没有房间。</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((room) => (
            <Card key={room.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-[#2d2d2d]">{room.roomName}</p>
                  <p className="mt-1 text-xs text-[#666666]">
                    第 {room.roundNumber} 轮 · 第 {room.matchNumber} 场
                  </p>
                </div>
                <Badge variant={statusVariant(room.status)}>{room.status}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-xs text-[#666666]">
                <p>时间：{room.matchDate || "-"} {room.matchTime || ""}</p>
                <p>最大人数：{room.maxParticipants}</p>
                {room.description && <p>描述：{room.description}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-[#b0a898]">{formatDate(room.createdAt)}</span>
                <Dialog open={deleteTarget?.id === room.id} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(room)}>
                      删除
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>删除房间</DialogTitle>
                      <DialogDescription>
                        确定要删除「{room.roomName}」吗？此操作不可撤销。
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">取消</Button>
                      </DialogClose>
                      <Button variant="destructive" onClick={confirmDelete} disabled={delBusy}>
                        {delBusy ? "删除中…" : "确认删除"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}