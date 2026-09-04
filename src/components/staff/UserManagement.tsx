import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDate } from "@/lib/utils";
import {
  REG_STATUS_OPTIONS,
  REG_STATUS_VARIANT,
  REG_STATUS_LABEL,
} from "@/lib/types";
import type { AdminUserStub } from "@/lib/types";

const GROUP_OPTIONS = [
  { value: "all", label: "全部分组" },
  { value: "player", label: "玩家" },
  { value: "admin", label: "管理员" },
];

export default function UserManagement() {
  const { data, loading, error, load } = useFetch<AdminUserStub[]>(() =>
    api.get("/api/admin/users"),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserStub | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");

  const groupVariant = (g: string) => (g === "admin" ? "primary" : "teal");

  const run = async (action: string, fn: () => Promise<{ ok: boolean }>) => {
    setBusy(action);
    const res = await fn();
    setBusy(null);
    if (res.ok) {
      toast({ title: "操作成功" });
      void load();
    } else {
      toast({ variant: "destructive", title: "操作失败" });
    }
  };

  const approve = (u: AdminUserStub) =>
    run(`approve-${u.osuId}`, () => api.post(`/api/admin/users/${u.osuId}/approve`));

  const setGroup = (u: AdminUserStub, group: "player" | "admin") =>
    run(`group-${u.osuId}`, () =>
      api.patch(`/api/admin/users/${u.osuId}`, { userGroup: group }),
    );

  const setStatus = (u: AdminUserStub, status: string) =>
    run(`status-${u.osuId}`, () =>
      api.patch(`/api/admin/users/${u.osuId}`, { registrationStatus: status }),
    );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDelBusy(true);
    const res = await api.delete(`/api/admin/users/${deleteTarget.osuId}`);
    setDelBusy(false);
    setDeleteTarget(null);
    if (res.ok) {
      toast({ title: "用户已删除" });
      void load();
    } else {
      toast({ variant: "destructive", title: "删除失败" });
    }
  };

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((u) => {
      if (groupFilter !== "all" && u.userGroup !== groupFilter) return false;
      if (!q) return true;
      return (
        u.username?.toLowerCase().includes(q) ||
        u.osuId?.toLowerCase().includes(q) ||
        u.userGroup?.toLowerCase().includes(q)
      );
    });
  }, [data, search, groupFilter]);

  if (loading) return <LoadingBlock label="加载用户中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  return (
    <div>
      <SectionTitle tag="用户管理" accent="#6b7fb5">
        注册用户
      </SectionTitle>

      <div className="rounded-2xl border-2 border-[#e0d8cc] bg-[#fdf6ee] p-4 text-xs text-[#666666]">
        报名流程说明：选手先在报名页提交报名 → 管理员在此「通过审核」后选手才能获得选手权限；
        也可通过「设为管理员/玩家」调整角色分组，或直接修改报名状态。
      </div>

      {/* 搜索与筛选 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b0a898]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户名 / osuId / 分组…"
            className="w-72 pl-9"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-[#b0a898]">
          共 {data.length} 人 · 筛选出 {filtered.length} 人
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b-2 border-[#e0d8cc] text-left text-xs text-[#b0a898]">
              <th className="px-4 py-3 font-bold">用户</th>
              <th className="px-4 py-3 font-bold">osuId</th>
              <th className="px-4 py-3 font-bold">分组</th>
              <th className="px-4 py-3 font-bold">报名状态</th>
              <th className="px-4 py-3 font-bold">注册时间</th>
              <th className="px-4 py-3 font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#b0a898]">
                  没有匹配的用户
                </td>
              </tr>
            )}
            {filtered.map((u) => {
              const regStatus = u.registrationStatus ?? "not_registered";
              return (
                <tr key={u.osuId} className="border-b border-[#e0d8cc] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.username} />}
                        <AvatarFallback>{u.username?.slice(0, 1) || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-[#2d2d2d]">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#666666]">{u.osuId}</td>
                  <td className="px-4 py-3">
                    <Badge variant={groupVariant(u.userGroup)}>{u.userGroup}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={REG_STATUS_VARIANT[regStatus] ?? "outline"}>
                      {REG_STATUS_LABEL[regStatus] ?? regStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#666666]">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {regStatus !== "approved" && (
                        <Button
                          variant="teal"
                          size="sm"
                          onClick={() => approve(u)}
                          disabled={busy !== null}
                        >
                          {busy === `approve-${u.osuId}` ? "…" : "通过审核"}
                        </Button>
                      )}
                      <Select
                        value={regStatus}
                        onValueChange={(v) => setStatus(u, v)}
                        disabled={busy !== null}
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REG_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGroup(u, u.userGroup === "admin" ? "player" : "admin")}
                        disabled={busy !== null}
                      >
                        {busy === `group-${u.osuId}`
                          ? "…"
                          : `设为${u.userGroup === "admin" ? "玩家" : "管理员"}`}
                      </Button>
                      <Dialog
                        open={deleteTarget?.osuId === u.osuId}
                        onOpenChange={(o) => !o && setDeleteTarget(null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(u)}>
                            删除
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>删除用户</DialogTitle>
                            <DialogDescription>
                              确定删除用户「{u.username}」吗？此操作不可撤销。
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
