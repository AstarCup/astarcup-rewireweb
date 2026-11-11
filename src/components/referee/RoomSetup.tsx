import { useState } from "react";
import { DoorOpen, Loader2, PlusSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  hub,
  invokeHub,
  slotCountError,
  type RoomJoinedResponse,
} from "@/lib/ref";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RULESET_OPTIONS = [
  { value: "0", label: "osu!（标准）" },
  { value: "1", label: "taiko（太鼓）" },
  { value: "2", label: "catch（接水果）" },
  { value: "3", label: "mania（下落式）" },
];

/** 首图 Beatmap ID 的默认值：留空即用它 */
const DEFAULT_BEATMAP_ID = 5228817;

interface RoomSetupProps {
  /** MakeRoom / JoinRoom 成功后回传 RoomJoinedResponse */
  onRoomJoined: (resp: RoomJoinedResponse) => void;
}

/** 中栏（未进房时）：创建房间 + 加入房间 */
export default function RoomSetup({ onRoomJoined }: RoomSetupProps) {
  // MakeRoom
  const [rulesetId, setRulesetId] = useState("0");
  const [beatmapId, setBeatmapId] = useState(String(DEFAULT_BEATMAP_ID));
  const [roomName, setRoomName] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState("");
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [makeBusy, setMakeBusy] = useState(false);

  // JoinRoom
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  const makeRoom = async () => {
    const ruleset = parseInt(rulesetId, 10);
    // Beatmap ID 留空时用默认首图
    const beatmapRaw = beatmapId.trim();
    const beatmap = beatmapRaw === "" ? DEFAULT_BEATMAP_ID : Number(beatmapRaw);
    const name = roomName.trim();
    if (!Number.isFinite(ruleset) || ruleset < 0) {
      toast({ variant: "destructive", title: "请输入有效的规则集 ID（0=osu! 1=taiko 2=catch 3=mania）" });
      return;
    }
    if (!Number.isFinite(beatmap) || beatmap <= 0) {
      toast({ variant: "destructive", title: "请输入有效的 Beatmap ID" });
      return;
    }
    if (!name) {
      toast({ variant: "destructive", title: "请填写房间名" });
      return;
    }
    let max_participants = 0;
    if (!unlimited) {
      const n = Number(maxParticipants);
      const err = slotCountError(n);
      if (err || n === 0) {
        setSlotsError(err ?? "请输入 2–16 之间的槽位数。");
        return;
      }
      max_participants = n;
      setSlotsError(null);
    } else {
      setSlotsError(null);
    }
    setMakeBusy(true);
    const res = await invokeHub<RoomJoinedResponse>(
      hub.makeRoom({ ruleset_id: ruleset, beatmap_id: beatmap, name, max_participants }),
    );
    setMakeBusy(false);
    if (res.ok && res.data) {
      toast({ title: "房间已创建", description: res.data.name });
      onRoomJoined(res.data);
    } else if (!res.ok) {
      toast({ variant: "destructive", title: "创建房间失败", description: res.error.message });
    }
  };

  const joinRoom = async () => {
    const roomId = Number(joinRoomId.trim());
    if (!Number.isFinite(roomId) || roomId <= 0) {
      toast({ variant: "destructive", title: "请输入有效的房间 ID" });
      return;
    }
    setJoinBusy(true);
    const res = await invokeHub<RoomJoinedResponse>(hub.joinRoom(roomId));
    setJoinBusy(false);
    if (res.ok && res.data) {
      toast({ title: "已加入房间", description: res.data.name });
      onRoomJoined(res.data);
    } else if (!res.ok) {
      toast({ variant: "destructive", title: "加入房间失败", description: res.error.message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>房间设置</CardTitle>
        <CardDescription>创建一个新房间，或加入已有房间后开始执裁。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {/* MakeRoom */}
        <div className="grid gap-3">
          <p className="text-sm font-bold text-(--pc-ink)">创建房间</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ref-make-ruleset">规则集</Label>
              <Select value={rulesetId} onValueChange={setRulesetId}>
                <SelectTrigger id="ref-make-ruleset" className="w-full">
                  <SelectValue placeholder="选择模式" />
                </SelectTrigger>
                <SelectContent>
                  {RULESET_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ref-make-beatmap">Beatmap ID</Label>
              <Input
                id="ref-make-beatmap"
                type="number"
                value={beatmapId}
                onChange={(e) => setBeatmapId(e.target.value)}
                placeholder={`留空默认 ${DEFAULT_BEATMAP_ID}`}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ref-make-name">房间名</Label>
              <Input
                id="ref-make-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="例如：Astra Cup R1 — A vs B"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ref-make-max">最大人数</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ref-make-max"
                  type="number"
                  min={2}
                  max={16}
                  value={maxParticipants}
                  disabled={unlimited}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder="2-16"
                />
                <Button
                  type="button"
                  variant={unlimited ? "primary" : "outline"}
                  size="sm"
                  aria-pressed={unlimited}
                  onClick={() => setUnlimited((u) => !u)}
                >
                  不限
                </Button>
              </div>
              {slotsError && <p className="text-xs text-destructive">{slotsError}</p>}
            </div>
          </div>
          <div>
            <Button onClick={makeRoom} disabled={makeBusy}>
              {makeBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusSquare className="h-4 w-4" />
              )}
              创建房间
            </Button>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-(--pc-border)" />

        {/* JoinRoom */}
        <div className="grid gap-3">
          <p className="text-sm font-bold text-(--pc-ink)">加入房间</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ref-join-room">房间 ID</Label>
              <Input
                id="ref-join-room"
                type="number"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="osu! 多人游戏房间 ID"
              />
            </div>
          </div>
          <div>
            <Button variant="teal" onClick={joinRoom} disabled={joinBusy}>
              {joinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
              加入房间
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
