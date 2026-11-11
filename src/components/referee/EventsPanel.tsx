import { useState } from "react";
import { Loader2, Radio } from "lucide-react";
import { hub, invokeHub, type EventLogEntry } from "@/lib/ref";
import { Badge } from "@/components/ui/badge";
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

interface EventsPanelProps {
  events: EventLogEntry[];
}

/** 右栏下半：Events 事件日志（倒序）+ Debug（Ping） */
export default function EventsPanel({ events }: EventsPanelProps) {
  const [pingBusy, setPingBusy] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; text: string } | null>(null);

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
        <Badge variant="outline">{events.length} 条</Badge>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="max-h-[300px] overflow-y-auto rounded-xl border-2 border-(--pc-border) bg-(--pc-paper) p-2">
          {events.length === 0 && (
            <p className="py-6 text-center text-sm text-(--pc-faint)">暂无事件…</p>
          )}
          <div className="flex flex-col gap-2">
            {events.map((ev) => (
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
          <Button variant="outline" size="sm" onClick={sendPing} disabled={pingBusy}>
            {pingBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Radio className="h-3.5 w-3.5" />
            )}
            发送 Ping
          </Button>
          {pingResult && (
            <span
              className={
                pingResult.ok ? "text-xs font-bold text-pc-teal" : "text-xs font-bold text-pc-primary"
              }
            >
              {pingResult.text}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
