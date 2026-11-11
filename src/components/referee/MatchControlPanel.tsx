import { useEffect, useState } from "react";
import { Loader2, OctagonX, Play, Timer, TimerOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { hub, invokeHub, type RefRoomState } from "@/lib/ref";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface MatchControlPanelProps {
  room: RefRoomState;
}

/** 左栏下半：倒计时秒数输入 + 本地倒计时 + Start/Stop Timer + Start/Abort Match */
export default function MatchControlPanel({ room }: MatchControlPanelProps) {
  const [secondsText, setSecondsText] = useState("0");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // 本地倒计时（简化：仅本页显示，不发聊天播报）
  useEffect(() => {
    if (remaining == null) return;
    if (remaining <= 0) {
      setRemaining(null);
      return;
    }
    const t = window.setTimeout(() => setRemaining((r) => (r == null ? null : r - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [remaining]);

  const seconds = () => {
    const n = parseInt(secondsText, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const startTimer = () => {
    const n = seconds();
    if (n <= 0) {
      toast({ variant: "destructive", title: "倒计时秒数需大于 0" });
      return;
    }
    setRemaining(n);
  };

  const stopTimer = async () => {
    setRemaining(null);
    setBusy("stop");
    const res = await invokeHub(hub.stopMatchCountdown(room.id));
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "destructive", title: "停止倒计时失败", description: res.error.message });
    }
  };

  const startMatch = async () => {
    setBusy("start");
    const res = await invokeHub(hub.startMatch(room.id, seconds()));
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "destructive", title: "开始比赛失败", description: res.error.message });
    }
  };

  const abortMatch = async () => {
    if (!window.confirm("确定要中止当前比赛吗？")) return;
    setBusy("abort");
    const res = await invokeHub(hub.abortMatch(room.id));
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "destructive", title: "中止比赛失败", description: res.error.message });
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base md:text-lg">比赛控制</CardTitle>
        <span className="text-xs font-bold text-(--pc-slate)">
          {remaining != null ? `本地倒计时 ${mmss(remaining)}` : `状态：${room.status}`}
        </span>
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
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="yellow" size="sm" onClick={startTimer}>
            <Timer className="h-3.5 w-3.5" /> 开始倒计时
          </Button>
          <Button variant="outline" size="sm" onClick={stopTimer} disabled={busy === "stop"}>
            {busy === "stop" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <TimerOff className="h-3.5 w-3.5" />
            )}
            停止倒计时
          </Button>
          <Button variant="teal" size="sm" onClick={startMatch} disabled={busy === "start"}>
            {busy === "start" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            开始比赛
          </Button>
          <Button variant="destructive" size="sm" onClick={abortMatch} disabled={busy === "abort"}>
            {busy === "abort" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <OctagonX className="h-3.5 w-3.5" />
            )}
            中止比赛
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
