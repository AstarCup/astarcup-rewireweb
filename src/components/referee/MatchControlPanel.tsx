import { useState } from "react";
import { Megaphone, OctagonX, Play, TimerOff } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "@/hooks/use-toast";
import { hub, invokeHub, type RefRoomState } from "@/lib/ref";
import type { MatchTimer } from "@/components/referee/useMatchTimer";
import { Badge } from "@/components/ui/badge";
import { BusyButton } from "@/components/ui/busy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const statusMeta: Record<
  RefRoomState["status"],
  { label: string; variant: "teal" | "yellow" | "primary" }
> = {
  Idle: { label: "空闲", variant: "teal" },
  Playing: { label: "比赛中", variant: "yellow" },
  Aborted: { label: "已中止", variant: "primary" },
};

interface MatchControlPanelProps {
  room: RefRoomState;
  timer: MatchTimer;
}

/** 左栏下半：倒计时秒数 + 开始比赛 / 倒计时播报 / 停止倒计时 / 中止比赛 */
export default function MatchControlPanel({ room, timer }: MatchControlPanelProps) {
  const confirm = useConfirm();
  const [secondsText, setSecondsText] = useState("0");
  const [busy, setBusy] = useState<string | null>(null);

  const seconds = () => {
    const n = parseInt(secondsText, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  /** 只播报倒计时（对应 apl-ref 的 timer 按钮 / !mp timer） */
  const announceTimer = () => {
    const n = seconds();
    if (n <= 0) {
      toast({ variant: "destructive", title: "倒计时秒数需大于 0" });
      return;
    }
    timer.start(n);
  };

  const stopTimer = async () => {
    timer.stop();
    setBusy("stop");
    const res = await invokeHub(hub.stopMatchCountdown(room.id));
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "destructive", title: "停止倒计时失败", description: res.error.message });
    }
  };

  const startMatch = async () => {
    const n = seconds();
    setBusy("start");
    const res = await invokeHub(hub.startMatch(room.id, n));
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "destructive", title: "开始比赛失败", description: res.error.message });
      return;
    }
    // 真开始比赛时同步房间聊天播报，玩家在 osu! 里也能看到剩余时间
    if (n > 0) timer.start(n);
  };

  const abortMatch = async () => {
    if (!(await confirm({ title: "确定要中止当前比赛吗？" }))) return;
    setBusy("abort");
    const res = await invokeHub(hub.abortMatch(room.id));
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "destructive", title: "中止比赛失败", description: res.error.message });
    }
  };

  const status = statusMeta[room.status];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base md:text-lg">比赛控制</CardTitle>
        <div className="flex items-center gap-2 text-xs text-(--pc-slate)">
          {timer.remaining != null ? (
            <span className="font-mono text-sm font-bold text-pc-primary">
              {mmss(timer.remaining)}
              <span className="ml-1 text-[10px] font-normal text-(--pc-faint)">播报中</span>
            </span>
          ) : (
            <Badge variant={status.variant}>{status.label}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ref-countdown-seconds">倒计时秒数（0 = 立即开始）</Label>
          <Input
            id="ref-countdown-seconds"
            type="number"
            min={0}
            value={secondsText}
            onChange={(e) => setSecondsText(e.target.value)}
          />
          <p className="text-[11px] text-(--pc-faint)">
            倒计时会在房间聊天里播报（开始 / 30·15·10·5 秒 / 整分钟 / 结束）。
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label>快速计时</Label>
          <div className="flex gap-2">
            {[120, 60, 30].map((n) => (
              <Button
                key={n}
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setSecondsText(String(n));
                  timer.start(n);
                }}
                title={`立即开始 ${n} 秒倒计时播报，并填入秒数`}
              >
                {n}s
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <BusyButton
            variant="teal"
            size="sm"
            onClick={startMatch}
            loading={busy === "start"}
            icon={<Play className="h-3.5 w-3.5" />}
          >
            开始比赛
          </BusyButton>
          <Button variant="yellow" size="sm" onClick={announceTimer}>
            <Megaphone className="h-3.5 w-3.5" /> 倒计时播报
          </Button>
          <BusyButton
            variant="outline"
            size="sm"
            onClick={stopTimer}
            loading={busy === "stop"}
            icon={<TimerOff className="h-3.5 w-3.5" />}
          >
            停止倒计时
          </BusyButton>
          <BusyButton
            variant="destructive"
            size="sm"
            onClick={abortMatch}
            loading={busy === "abort"}
            icon={<OctagonX className="h-3.5 w-3.5" />}
          >
            中止比赛
          </BusyButton>
        </div>
      </CardContent>
    </Card>
  );
}
