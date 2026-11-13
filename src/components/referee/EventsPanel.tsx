import { useState } from "react";
import { Download, Radio, Trash2 } from "lucide-react";
import { downloadBlob } from "@/lib/api";
import { hub, invokeHub, type EventLogEntry } from "@/lib/ref";
import { useConfirm } from "@/hooks/use-confirm";
import { Badge } from "@/components/ui/badge";
import { BusyButton } from "@/components/ui/busy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** 事件数据 → 展示行（照 apl-ref utils.js 的 logEvent；room_id 仅 RefereeInvited 保留） */
function dataLines(name: string, data: unknown): string[] {
  if (data == null) return [];
  if (typeof data === "string") return [data];
  if (typeof data !== "object") return [String(data)];
  return Object.entries(data as Record<string, unknown>)
    .filter(([k]) => k !== "room_id" || name === "RefereeInvited")
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
}

/** 关键事件（折叠高频的状态/资料刷新事件用） */
const KEY_EVENTS = new Set([
  "MatchStarted",
  "MatchAborted",
  "MatchCompleted",
  "CountdownStarted",
  "CountdownStopped",
  "UserJoined",
  "UserLeft",
  "UserKicked",
  "UserBanned",
  "RefereeAdded",
  "RefereeRemoved",
  "RefereeInvited",
  "RoomSettingsChanged",
  "MatchStateChanged",
  "PlaylistItemAdded",
  "PlaylistItemChanged",
  "PlaylistItemRemoved",
  "RollCompleted",
]);

interface EventsPanelProps {
  events: EventLogEntry[];
  /** 清空事件日志（含本地持久化） */
  onClear?: () => void;
}

/** 右栏下半：Events 事件日志（倒序）+ Debug（Ping） */
export default function EventsPanel({ events, onClear }: EventsPanelProps) {
  const confirm = useConfirm();
  const [pingBusy, setPingBusy] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [onlyKey, setOnlyKey] = useState(false);

  /** 导出全部事件日志（JSON，含完整数据） */
  const exportLog = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      count: events.length,
      events: events.map((e) => ({ at: e.at.toISOString(), name: e.name, data: e.data })),
    };
    const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      `ref-events-${ts}.json`,
    );
  };

  const clearLog = async () => {
    if (!(await confirm({ title: "确定清空事件日志吗？此操作不可恢复。" }))) return;
    onClear?.();
  };
  const list = onlyKey ? events.filter((ev) => KEY_EVENTS.has(ev.name)) : events;

  const sendPing = async () => {
    setPingBusy(true);
    const res = await invokeHub(hub.ping("PING TEST WORKING YAY"));
    setPingBusy(false);
    setPingResult(
      res.ok
        ? { ok: true, text: `OK ${JSON.stringify(res.data)}` }
        : { ok: false, text: res.error.message },
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base md:text-lg">事件日志</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{list.length} 条</Badge>
          <Button
            variant={onlyKey ? "primary" : "outline"}
            size="sm"
            aria-pressed={onlyKey}
            onClick={() => setOnlyKey((v) => !v)}
            title="只显示比赛/玩家/图池等关键事件"
          >
            关键事件
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="max-h-[300px] overflow-y-auto rounded-xl border-2 border-(--pc-border) bg-(--pc-paper) p-2">
          {list.length === 0 && (
            <p className="py-6 text-center text-sm text-(--pc-faint)">暂无事件…</p>
          )}
          <div className="flex flex-col gap-2">
            {list.map((ev) => (
              <div key={ev.id} className="border-b border-dashed border-(--pc-border) pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-(--pc-ink)">{ev.name}</span>
                  <span className="font-mono text-[10px] text-(--pc-faint)">
                    {ev.at.toLocaleTimeString("zh-CN", { hour12: false })}
                  </span>
                </div>
                <div className="mt-1">
                  {dataLines(ev.name, ev.data).map((line) => (
                    <div key={line} className="break-all font-mono text-[10px] text-(--pc-slate)">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BusyButton
            variant="outline"
            size="sm"
            onClick={sendPing}
            loading={pingBusy}
            icon={<Radio className="h-3.5 w-3.5" />}
          >
            发送 Ping
          </BusyButton>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLog}
            disabled={events.length === 0}
            title="导出事件日志（JSON）"
          >
            <Download className="h-3.5 w-3.5" /> 导出
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLog}
            disabled={events.length === 0}
            title="清空事件日志"
          >
            <Trash2 className="h-3.5 w-3.5" /> 清空
          </Button>
          {pingResult && (
            <span
              className={`ml-auto truncate text-right ${
                pingResult.ok
                  ? "text-xs font-bold text-pc-teal"
                  : "text-xs font-bold text-pc-primary"
              }`}
            >
              {pingResult.text}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
