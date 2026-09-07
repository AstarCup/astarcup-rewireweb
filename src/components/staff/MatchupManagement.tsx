import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useFetch, LoadingBlock, ErrorBlock, useAsync } from "@/hooks/useFetch";
import { api, qs } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { PlayerMatchup, PlayerStub } from "@/lib/types";

const STATUS_META: Record<string, { label: string; variant: "primary" | "teal" | "yellow" | "blue" | "outline" }> = {
  available: { label: "可预约", variant: "teal" },
  pending: { label: "待确认", variant: "yellow" },
  scheduled: { label: "已排期", variant: "blue" },
  completed: { label: "已完成", variant: "outline" },
};

function statusVariant(s: string): "primary" | "teal" | "yellow" | "blue" | "outline" {
  return STATUS_META[s]?.variant ?? "outline";
}

function statusLabel(s: string): string {
  return STATUS_META[s]?.label ?? s;
}

export default function MatchupManagement() {
  const { data, loading, error, load } = useFetch<PlayerMatchup[]>(() => api.get("/api/matchups"));
  const players = useFetch<PlayerStub[]>(() =>
    api.get("/api/players" + qs({ status: "approved" })),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlayerMatchup | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const patch = useAsync<PlayerMatchup>();

  const playerList = players.data ?? [];
  const playerById = (id: string) => playerList.find((p) => p.osuId === id);

  const createMatchup = async () => {
    if (!p1 || !p2 || p1 === p2) {
      toast({ title: "请选择两名不同选手" });
      return;
    }
    setBusy(true);
    const a = playerById(p1);
    const b = playerById(p2);
    const res = await api.post("/api/matchups", {
      player1OsuId: p1,
      player1Username: a?.username ?? "",
      player2OsuId: p2,
      player2Username: b?.username ?? "",
    });
    setBusy(false);
    if (res.ok) {
      toast({ title: "对战已创建" });
      setCreateOpen(false);
      setP1("");
      setP2("");
      void load();
    } else {
      toast({ variant: "destructive", title: "创建失败" });
    }
  };

  const updateStatus = async (m: PlayerMatchup, status: string) => {
    const res = await patch.run(() =>
      api.patch(`/api/matchups/${m.id}`, { status }),
    );
    if (res?.ok) {
      toast({ title: "状态已更新" });
      void load();
    } else {
      toast({ variant: "destructive", title: "状态更新失败" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDelBusy(true);
    const res = await api.delete(`/api/matchups/${deleteTarget.id}`);
    setDelBusy(false);
    setDeleteTarget(null);
    if (res.ok) {
      toast({ title: "对战已删除" });
      void load();
    } else {
      toast({ variant: "destructive", title: "删除失败" });
    }
  };

  if (loading) return <LoadingBlock label="加载对战列表…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle tag="对战列表" accent="#f5c040" className="mb-0">
          比赛对战
        </SectionTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="primary">新建对战</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建对战</DialogTitle>
              <DialogDescription>从已过审选手中选择两名选手。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>选手一</Label>
                <Select value={p1} onValueChange={setP1}>
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
                <Select value={p2} onValueChange={setP2}>
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
              <Button variant="primary" onClick={createMatchup} disabled={busy}>
                {busy ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#b0a898]">还没有对战。</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-[#2d2d2d]">
                  {m.player1Username} <span className="text-[#b0a898]">vs</span> {m.player2Username}
                </p>
                <Badge variant={statusVariant(m.status)}>{statusLabel(m.status)}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Label className="mr-1 text-xs text-[#b0a898]">状态</Label>
                <Select value={m.status} onValueChange={(v) => updateStatus(m, v)}>
                  <SelectTrigger className="h-9 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">可预约</SelectItem>
                    <SelectItem value="pending">待确认</SelectItem>
                    <SelectItem value="scheduled">已排期</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={deleteTarget?.id === m.id} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="ml-auto" onClick={() => setDeleteTarget(m)}>
                      删除
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>删除对战</DialogTitle>
                      <DialogDescription>
                        确定删除「{m.player1Username} vs {m.player2Username}」？
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