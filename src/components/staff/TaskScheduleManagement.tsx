import { useCallback, useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import { SectionHeader, SectionTitle } from "@/components/paper/paper";
import { ErrorBlock, LoadingBlock } from "@/components/paper/feedback";
import { PaperTable, Td, Th, Thead } from "@/components/paper/table";
import { BusyButton } from "@/components/ui/busy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface ScheduledTask {
  name: string;
  title: string;
  enabled: boolean;
  intervalSecs: number;
  startTime: string;
  runAmount: number;
  params: Record<string, unknown>;
  lastRunAt: string | null;
  lastRunNote: string;
}

interface Draft {
  enabled: boolean;
  intervalSecs: number;
  startTime: string;
  runAmount: number;
  staleHours: number;
}

function toDraft(t: ScheduledTask): Draft {
  return {
    enabled: t.enabled,
    intervalSecs: t.intervalSecs,
    startTime: t.startTime,
    runAmount: t.runAmount,
    staleHours: typeof t.params.stale_hours === "number" ? t.params.stale_hours : 24,
  };
}

/** 计划任务管理：配置调度器任务的启停、节奏与参数 */
export default function TaskScheduleManagement() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [runningName, setRunningName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ tasks: ScheduledTask[] }>("/api/admin/scheduled-tasks");
    if (res.ok) {
      setTasks(res.data.tasks);
      setDrafts(Object.fromEntries(res.data.tasks.map((t) => [t.name, toDraft(t)])));
      setError(null);
    } else {
      setError(res.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = (name: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [name]: { ...d[name], ...patch } }));

  const save = async (t: ScheduledTask) => {
    const d = drafts[t.name];
    setSavingName(t.name);
    const res = await api.patch(`/api/admin/scheduled-tasks/${t.name}`, {
      enabled: d.enabled,
      intervalSecs: d.intervalSecs,
      startTime: d.startTime,
      runAmount: d.runAmount,
      params:
        t.params.stale_hours !== undefined ? { ...t.params, stale_hours: d.staleHours } : t.params,
    });
    setSavingName(null);
    if (res.ok) {
      toast({ title: "已保存" });
      await load();
    } else {
      toast({ variant: "destructive", title: "保存失败", description: res.error.message });
    }
  };

  const runNow = async (t: ScheduledTask) => {
    setRunningName(t.name);
    const res = await api.post<{ note: string }>(`/api/admin/scheduled-tasks/${t.name}/run`);
    setRunningName(null);
    if (res.ok) {
      toast({ title: "执行完成", description: res.data.note });
      await load();
    } else {
      toast({ variant: "destructive", title: "执行失败", description: res.error.message });
    }
  };

  if (loading) return <LoadingBlock label="加载计划任务…" />;
  if (error) return <ErrorBlock message={error} onRetry={() => void load()} />;

  return (
    <div>
      <SectionHeader className="mb-6">
        <SectionTitle className="mb-0">计划任务</SectionTitle>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> 刷新
        </Button>
      </SectionHeader>

      <PaperTable minWidth={1080}>
        <Thead>
          <tr>
            <Th>任务</Th>
            <Th>启用</Th>
            <Th>起始时间</Th>
            <Th>间隔（秒）</Th>
            <Th>每次数量</Th>
            <Th>刷新阈值（小时）</Th>
            <Th>上次执行</Th>
            <Th className="text-right">操作</Th>
          </tr>
        </Thead>
        <tbody>
          {tasks.map((t) => {
            const d = drafts[t.name];
            if (!d) return null;
            const hasStale = t.params.stale_hours !== undefined;
            return (
              <tr key={t.name} className="border-b border-(--pc-border) last:border-b-0">
                <Td>
                  <div className="font-bold text-(--pc-ink)">{t.title || t.name}</div>
                  <div className="text-xs text-(--pc-faint)">{t.name}</div>
                </Td>
                <Td>
                  <Switch
                    checked={d.enabled}
                    onCheckedChange={(v) => updateDraft(t.name, { enabled: v })}
                  />
                </Td>
                <Td>
                  <Input
                    value={d.startTime}
                    onChange={(e) => updateDraft(t.name, { startTime: e.target.value })}
                    className="w-20"
                    placeholder="00:00"
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    min={1}
                    value={d.intervalSecs}
                    onChange={(e) => updateDraft(t.name, { intervalSecs: Number(e.target.value) })}
                    className="w-24"
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    min={1}
                    value={d.runAmount}
                    onChange={(e) => updateDraft(t.name, { runAmount: Number(e.target.value) })}
                    className="w-20"
                  />
                </Td>
                <Td>
                  {hasStale ? (
                    <Input
                      type="number"
                      min={1}
                      value={d.staleHours}
                      onChange={(e) => updateDraft(t.name, { staleHours: Number(e.target.value) })}
                      className="w-24"
                    />
                  ) : (
                    <span className="text-xs text-(--pc-faint)">—</span>
                  )}
                </Td>
                <Td>
                  <div className="text-xs">
                    {t.lastRunAt ? formatDateTime(t.lastRunAt) : "未执行"}
                  </div>
                  <div className="text-xs text-(--pc-faint)">{t.lastRunNote}</div>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <BusyButton
                      size="sm"
                      loading={runningName === t.name}
                      icon={<Play className="h-3.5 w-3.5" />}
                      onClick={() => void runNow(t)}
                    >
                      立即执行
                    </BusyButton>
                    <BusyButton
                      size="sm"
                      variant="teal"
                      loading={savingName === t.name}
                      onClick={() => void save(t)}
                    >
                      保存
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
