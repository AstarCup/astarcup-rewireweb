import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { ConfirmProvider, useConfirm } from "@/hooks/use-confirm";
import { SectionHeader, SectionTitle } from "@/components/paper/paper";
import { ErrorBlock, LoadingBlock } from "@/components/paper/feedback";
import { PaperTable, Td, Th, Thead } from "@/components/paper/table";
import { BusyButton } from "@/components/ui/busy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StaffRow {
  id: number;
  osuId: string;
  name: string;
  category: string;
  position: string;
  sortOrder: number;
}

interface Draft {
  category: string;
  position: string;
  sortOrder: number;
}

function toDraft(r: StaffRow): Draft {
  return { category: r.category, position: r.position, sortOrder: r.sortOrder };
}

/** 工作人员名单管理：只维护「谁是 staff + 分类 + 职位」，用户资料取自用户表 */
function StaffListInner() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ osuId: "", category: "", position: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ staff: StaffRow[] }>("/api/admin/staff");
    if (res.ok) {
      setRows(res.data.staff);
      setDrafts(Object.fromEntries(res.data.staff.map((r) => [r.id, toDraft(r)])));
      setError(null);
    } else {
      setError(res.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = (id: number, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const add = async () => {
    if (!newRow.osuId.trim()) {
      toast({ variant: "destructive", title: "请填写 osuId" });
      return;
    }
    setAdding(true);
    const res = await api.post("/api/admin/staff", {
      osuId: newRow.osuId.trim(),
      category: newRow.category,
      position: newRow.position,
    });
    setAdding(false);
    if (res.ok) {
      toast({ title: "已添加" });
      setNewRow({ osuId: "", category: "", position: "" });
      await load();
    } else {
      toast({ variant: "destructive", title: "添加失败", description: res.error.message });
    }
  };

  const save = async (r: StaffRow) => {
    const d = drafts[r.id];
    setSavingId(r.id);
    const res = await api.patch(`/api/admin/staff/${r.id}`, {
      category: d.category,
      position: d.position,
      sortOrder: d.sortOrder,
    });
    setSavingId(null);
    if (res.ok) {
      toast({ title: "已保存" });
      await load();
    } else {
      toast({ variant: "destructive", title: "保存失败", description: res.error.message });
    }
  };

  const remove = async (r: StaffRow) => {
    const name = r.name || r.osuId;
    if (!(await confirm({ title: `确定将 ${name} 移出 staff 名单吗？` }))) return;
    setDeletingId(r.id);
    const res = await api.delete(`/api/admin/staff/${r.id}`);
    setDeletingId(null);
    if (res.ok) {
      toast({ title: "已移出名单" });
      await load();
    } else {
      toast({ variant: "destructive", title: "删除失败", description: res.error.message });
    }
  };

  if (loading) return <LoadingBlock label="加载工作人员名单…" />;
  if (error) return <ErrorBlock message={error} onRetry={() => void load()} />;

  return (
    <div>
      <SectionHeader className="mb-6">
        <SectionTitle className="mb-0">工作人员</SectionTitle>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> 刷新
        </Button>
      </SectionHeader>

      {/* 新增成员 */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-(--pc-white) p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
        <div>
          <div className="mb-1 text-xs font-bold text-(--pc-faint)">osuId</div>
          <Input
            value={newRow.osuId}
            onChange={(e) => setNewRow((n) => ({ ...n, osuId: e.target.value }))}
            placeholder="osu! 用户 ID"
            className="w-40"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold text-(--pc-faint)">分类</div>
          <Input
            value={newRow.category}
            onChange={(e) => setNewRow((n) => ({ ...n, category: e.target.value }))}
            placeholder="如 special"
            className="w-36"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold text-(--pc-faint)">职位</div>
          <Input
            value={newRow.position}
            onChange={(e) => setNewRow((n) => ({ ...n, position: e.target.value }))}
            placeholder="如 图池策划"
            className="w-48"
          />
        </div>
        <BusyButton loading={adding} icon={<Plus className="h-4 w-4" />} onClick={() => void add()}>
          添加
        </BusyButton>
      </div>

      <PaperTable minWidth={860}>
        <Thead>
          <tr>
            <Th>成员</Th>
            <Th>分类</Th>
            <Th>职位</Th>
            <Th>排序</Th>
            <Th className="text-right">操作</Th>
          </tr>
        </Thead>
        <tbody>
          {rows.map((r) => {
            const d = drafts[r.id];
            if (!d) return null;
            return (
              <tr key={r.id} className="border-b border-(--pc-border) last:border-b-0">
                <Td>
                  <div className="font-bold text-(--pc-ink)">{r.name || "（未登记用户）"}</div>
                  <div className="text-xs text-(--pc-faint)">osuId: {r.osuId}</div>
                </Td>
                <Td>
                  <Input
                    value={d.category}
                    onChange={(e) => updateDraft(r.id, { category: e.target.value })}
                    className="w-40"
                  />
                </Td>
                <Td>
                  <Input
                    value={d.position}
                    onChange={(e) => updateDraft(r.id, { position: e.target.value })}
                    className="w-52"
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    value={d.sortOrder}
                    onChange={(e) => updateDraft(r.id, { sortOrder: Number(e.target.value) })}
                    className="w-20"
                  />
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <BusyButton
                      size="sm"
                      variant="teal"
                      loading={savingId === r.id}
                      onClick={() => void save(r)}
                    >
                      保存
                    </BusyButton>
                    <BusyButton
                      size="sm"
                      variant="outline"
                      loading={deletingId === r.id}
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => void remove(r)}
                    >
                      移出
                    </BusyButton>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </PaperTable>
    </div>
  );
}

export default function StaffListManagement() {
  return (
    <ConfirmProvider>
      <StaffListInner />
    </ConfirmProvider>
  );
}
