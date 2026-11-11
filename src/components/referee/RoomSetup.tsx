import { useEffect, useMemo, useState } from "react";
import { DoorOpen, Loader2, PlusSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  hub,
  invokeHub,
  slotCountError,
  type RoomJoinedResponse,
} from "@/lib/ref";
import { api } from "@/lib/api";
import { stageLabelOf } from "@/lib/rooms";
import { useCurrentSeason, useSeasonOptions } from "@/lib/seasons";
import type { MatchSchedule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RULESET_OPTIONS = [
  { value: "0", label: "osu!（标准）" },
  { value: "1", label: "taiko（太鼓）" },
  { value: "2", label: "catch（接水果）" },
  { value: "3", label: "mania（下落式）" },
];

/** 赛季展示："s1" → "S1" */
function seasonTag(season: string | null | undefined, fallback: string): string {
  const s = (season ?? fallback ?? "").trim();
  return s ? s.toUpperCase() : "";
}

/** 赛季展示："s1" → "S1" */
const STAGE_ORDER = ["QUA", "RO16", "QF", "SF", "F", "GF"];

/** 赛程 → 阶段简称（来自关联房间；无房间则空） */
function stageOf(m: MatchSchedule): string {
  return m.room ? stageLabelOf(m.room) : "";
}

/** 阶段排序权重：数字越大越靠前（GF 最前，QUA 最后） */
function stageRank(stage: string, m: MatchSchedule): number {
  const rn = m.room?.roundNumber ?? 0;
  if (rn >= 1 && rn <= 6) return rn;
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? 0 : 6 - i;
}

/** 对战 → 房间名：AstarCup S[赛季] - [阶段简称]: (红玩家) vs (蓝玩家) */
function scheduleRoomName(m: MatchSchedule, fallbackSeason: string): string {
  const season = seasonTag(m.season ?? m.room?.season, fallbackSeason);
  const stage = stageOf(m);
  const head = season ? `AstarCup ${season}` : "AstarCup";
  return `${head}${stage ? ` - ${stage}` : ""}: (${m.player1Username}) vs (${m.player2Username})`;
}

/** 首图 Beatmap ID 的默认值：留空即用它 */
const DEFAULT_BEATMAP_ID = 5228817;

interface RoomSetupProps {
  /** MakeRoom / JoinRoom 成功后回传 RoomJoinedResponse */
  onRoomJoined: (resp: RoomJoinedResponse) => void;
  /** 对战下拉选中的赛程（供玩家面板一键邀请选手） */
  onSelectMatchup?: (m: MatchSchedule | null) => void;
}

/** 中栏（未进房时）：创建房间 + 加入房间 */
export default function RoomSetup({ onRoomJoined, onSelectMatchup }: RoomSetupProps) {
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

  // 从对战列表（赛程）自动填房间名；阶段挂在赛程关联的房间上
  const currentSeason = useCurrentSeason();
  const [schedules, setSchedules] = useState<MatchSchedule[]>([]);
  const [pickedSchedule, setPickedSchedule] = useState<string | undefined>(undefined);
  /** 赛季筛选：区分不同赛季的对战 */
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  useEffect(() => {
    void api.get<MatchSchedule[]>("/api/schedules").then((res) => {
      if (res.ok && Array.isArray(res.data)) {
        // 未打完的排前面，再按日期；取消的不展示
        const list = res.data
          .filter((s) => s.status !== "cancelled")
          .sort((a, b) => {
            const done =
              Number(a.status === "completed") - Number(b.status === "completed");
            if (done !== 0) return done;
            return String(a.room?.matchDate ?? "").localeCompare(
              String(b.room?.matchDate ?? ""),
            );
          });
        setSchedules(list);
      }
    });
  }, []);

  // 按 赛季 · 阶段 分组（赛季升序，阶段按 QUA→GF）；选定赛季时组标题只显示阶段
  const seasonOptions = useSeasonOptions(
    useMemo(() => schedules.map((s) => s.season ?? s.room?.season ?? ""), [schedules]),
  );
  const filteredSchedules = useMemo(
    () =>
      seasonFilter === "all"
        ? schedules
        : schedules.filter(
            (s) =>
              (s.season ?? s.room?.season ?? "").toLowerCase() === seasonFilter.toLowerCase(),
          ),
    [schedules, seasonFilter],
  );
  const scheduleGroups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; items: MatchSchedule[]; season: string; rank: number }
    >();
    for (const s of filteredSchedules) {
      const season = seasonTag(s.season ?? s.room?.season, currentSeason) || "未定赛季";
      const stage = stageOf(s) || "未定阶段";
      const key = `${season}|${stage}`;
      const g = map.get(key) ?? {
        label: seasonFilter === "all" ? `${season} · ${stage}` : stage,
        items: [],
        season,
        rank: stageRank(stage, s),
      };
      g.items.push(s);
      map.set(key, g);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.season.localeCompare(b.season, undefined, { numeric: true }) || b.rank - a.rank,
    );
  }, [filteredSchedules, currentSeason, seasonFilter]);

  const scheduleOptionLabel = (s: MatchSchedule): string => {
    return [
      `${s.player1Username} vs ${s.player2Username}`,
      s.status === "completed" ? "已打完" : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };

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
      // 新建房间默认改为团队赛（Team Versus）
      void invokeHub(
        hub.changeRoomSettings(res.data.room_id, { type: "team_versus" }),
      ).then((r) => {
        if (!r.ok) {
          toast({
            variant: "destructive",
            title: "切换团队赛失败",
            description: r.error.message,
          });
        }
      });
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
          {(scheduleGroups.length > 0 || seasonFilter !== "all") && (
            <div className="grid gap-1.5">
              <Label>从对战列表填入房间名（可选）</Label>
              <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="赛季" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部赛季</SelectItem>
                    {seasonOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={pickedSchedule}
                  onValueChange={(v) => {
                    setPickedSchedule(v);
                    const m = schedules.find((x) => String(x.id) === v);
                    onSelectMatchup?.(m ?? null);
                    if (m) setRoomName(scheduleRoomName(m, currentSeason));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择一场对战，自动填充房间名" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleGroups.map((g) => (
                      <SelectGroup key={g.label}>
                        <SelectLabel>{g.label}</SelectLabel>
                        {g.items.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {scheduleOptionLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
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
