import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Gavel, Link2, Loader2, Plug, ShieldCheck, Unplug } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { toast } from "@/hooks/use-toast";
import { LoadingBlock } from "@/hooks/useFetch";
import {
  applyHubEvent,
  asNum,
  createRoomState,
  mergeUser,
  refApi,
  subscribeRefEvents,
  type ChatLine,
  type EventLogEntry,
  type OsuChatMessage,
  type RefBindStatus,
  type RefConnectionState,
  type RefRoomState,
  type RoomJoinedResponse,
} from "@/lib/ref";
import type { DisplayScore } from "@/lib/types";
import { runChatInput } from "@/components/referee/chatCommands";
import RefereeTopBar from "@/components/referee/RefereeTopBar";
import PlayersPanel from "@/components/referee/PlayersPanel";
import MatchControlPanel from "@/components/referee/MatchControlPanel";
import RoomSetup from "@/components/referee/RoomSetup";
import ChatPanel from "@/components/referee/ChatPanel";
import ScoresPanel from "@/components/referee/ScoresPanel";
import MapQueuePanel from "@/components/referee/MapQueuePanel";
import ModSettingsPanel from "@/components/referee/ModSettingsPanel";
import EventsPanel from "@/components/referee/EventsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function PlaceholderCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-10">
        <p className="text-center text-sm text-(--pc-faint)">{text}</p>
      </CardContent>
    </Card>
  );
}

export default function RefereePage() {
  const { user, loading } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ---- 登录态：未登录去 /register（同 PlayerInfoPage） ----
  useEffect(() => {
    if (!loading && !user) navigate("/register", { replace: true });
  }, [loading, user, navigate]);

  // ---- osu! 绑定状态 ----
  const [bindStatus, setBindStatus] = useState<RefBindStatus | null>(null);
  const [bindLoading, setBindLoading] = useState(true);
  const loadBindStatus = useCallback(async () => {
    setBindLoading(true);
    const res = await refApi.getBindStatus();
    setBindStatus(res.ok ? res.data : null);
    setBindLoading(false);
  }, []);
  useEffect(() => {
    if (user) void loadBindStatus();
  }, [user, loadBindStatus]);

  // ---- OAuth 回跳：/referee?bound=1 或 ?error=xxx → toast + 清理地址栏 ----
  useEffect(() => {
    const b = searchParams.get("bound");
    const err = searchParams.get("error");
    if (b === "1") toast({ title: "osu! 账号绑定成功" });
    else if (err) toast({ variant: "destructive", title: "绑定失败", description: err });
    if (b || err) {
      const params = new URLSearchParams(window.location.search);
      params.delete("bound");
      params.delete("error");
      params.delete("reason");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 连接状态（SSE state 事件 + GET /api/ref/status） ----
  const [connState, setConnState] = useState<RefConnectionState>("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  useEffect(() => {
    if (!bindStatus?.bound) return;
    void (async () => {
      const res = await refApi.getStatus();
      if (res.ok) {
        setConnState(res.data.state);
        setLastError(res.data.lastError ?? null);
      }
    })();
  }, [bindStatus?.bound]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    const res = await refApi.connect();
    setConnecting(false);
    if (res.ok) {
      setConnState(res.data.state);
      setLastError(res.data.lastError ?? null);
      if (res.data.state === "connected") toast({ title: "已连接裁判服务器" });
      else if (res.data.lastError) {
        toast({ variant: "destructive", title: "连接失败", description: res.data.lastError });
      }
    } else {
      toast({ variant: "destructive", title: "连接失败", description: res.error.message });
    }
  }, []);

  // ---- 房间状态（models.js Room 模型；roomRef 同步最新快照，保证连续事件不丢更新） ----
  const [room, setRoom] = useState<RefRoomState | null>(null);
  const roomRef = useRef<RefRoomState | null>(null);
  roomRef.current = room;
  const meIdRef = useRef<string | null>(null);
  meIdRef.current = user?.osuId ?? null;

  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const eventIdRef = useRef(0);
  const [scores, setScores] = useState<DisplayScore[] | null>(null);
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const lineIdRef = useRef(0);
  const lastChatIdRef = useRef(0);

  // ---- 聊天辅助 ----
  const appendSystem = useCallback((content: string) => {
    setChatLines((prev) => [
      ...prev,
      { kind: "system", id: `s-${++lineIdRef.current}`, content, at: new Date().toISOString() },
    ]);
  }, []);

  const appendUserMessages = useCallback((msgs: OsuChatMessage[]) => {
    const roomNow = roomRef.current;
    const meId = meIdRef.current;
    const additions: ChatLine[] = [];
    for (const msg of msgs) {
      const id = asNum(msg.id) ?? ++lineIdRef.current + 1000000;
      if (id <= lastChatIdRef.current) continue;
      lastChatIdRef.current = Math.max(lastChatIdRef.current, id);
      const uid = asNum(msg.user_id) ?? asNum(msg.sender_id) ?? 0;
      const known = roomNow?.players[uid] ?? roomNow?.refs[uid];
      const sender = msg.sender;
      const username =
        known?.user?.username ||
        sender?.username ||
        (meId != null && String(uid) === meId ? (user?.username ?? "") : "") ||
        `玩家 #${uid}`;
      const avatarUrl = known?.user?.avatar_url ?? sender?.avatar_url ?? null;
      additions.push({
        kind: "user",
        id: `u-${id}`,
        userId: uid,
        username,
        avatarUrl,
        content: String(msg.content ?? ""),
        isAction: !!msg.is_action,
        at: String(msg.timestamp ?? ""),
      });
    }
    if (additions.length) setChatLines((prev) => [...prev, ...additions]);
    // 顺手把消息里的 sender 资料并进用户缓存
    const withSenders = msgs.filter((m) => m.sender && asNum(m.sender.id) != null);
    if (withSenders.length) {
      setRoom((prev) => {
        if (!prev) return prev;
        let r = prev;
        for (const m of withSenders) r = mergeUser(r, m.sender as NonNullable<typeof m.sender>);
        return r;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 比分（MatchCompleted 后拉取） ----
  const loadScores = useCallback(async (roomId: number, playlistId: number) => {
    const res = await refApi.getRoomScores(roomId, playlistId);
    if (!res.ok) {
      toast({ variant: "destructive", title: "获取比分失败", description: res.error.message });
      return;
    }
    const list: DisplayScore[] = Array.isArray(res.data)
      ? res.data
      : ((res.data as { scores?: DisplayScore[] } | null)?.scores ?? []);
    setScores(list);
    if (list.length) {
      // 比分里带用户名/头像，顺手补进用户缓存
      setRoom((prev) => {
        if (!prev) return prev;
        let r = prev;
        for (const s of list) {
          r = mergeUser(r, {
            id: s.userId,
            username: s.username,
            avatar_url: s.avatarUrl,
          });
        }
        return r;
      });
    }
  }, []);

  // ---- 本地清空房间（关闭/被踢） ----
  const handleCloseRoom = useCallback(() => {
    roomRef.current = null;
    setRoom(null);
    setScores(null);
    setChatLines([]);
    lastChatIdRef.current = 0;
  }, []);

  const handleRoomJoined = useCallback((resp: RoomJoinedResponse) => {
    const state = createRoomState(resp);
    roomRef.current = state;
    setRoom(state);
    setScores(null);
    setChatLines([]);
    lastChatIdRef.current = 0;
  }, []);

  // ---- 聊天轮询（5s）与发送 ----
  useEffect(() => {
    const channel = room?.chatChannelId;
    if (!room || channel == null) return;
    let stopped = false;
    const poll = async () => {
      const res = await refApi.getChatMessages(channel, lastChatIdRef.current || undefined);
      if (stopped || !res.ok || !Array.isArray(res.data)) return;
      appendUserMessages(res.data);
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [room, room?.chatChannelId, appendUserMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      const roomNow = roomRef.current;
      if (!roomNow) return;
      const handled = await runChatInput(text, {
        room: roomNow,
        system: appendSystem,
        closeRoom: handleCloseRoom,
      });
      if (handled) return;
      const res = await refApi.sendChat(roomNow.chatChannelId, text);
      if (res.ok && res.data) {
        appendUserMessages([res.data]);
      } else if (!res.ok) {
        toast({ variant: "destructive", title: "发送失败", description: res.error.message });
      }
    },
    [appendSystem, appendUserMessages, handleCloseRoom],
  );

  // ---- SSE 订阅：hub 事件 → 状态 / 日志 / 系统消息；state 事件 → 顶栏状态点 ----
  useEffect(() => {
    if (!user || !bindStatus?.bound) return;
    const stop = subscribeRefEvents({
      onHub: (ev) => {
        setEvents((prev) =>
          [
            { id: ++eventIdRef.current, name: ev.event, data: ev.data, at: new Date() },
            ...prev,
          ].slice(0, 200),
        );
        const roomNow = roomRef.current;
        if (!roomNow) return;
        const dataObj = (ev.data ?? {}) as Record<string, unknown>;
        const evRoomId = asNum(dataObj.room_id);
        // 只把当前房间的事件并入状态（照 models.js 的 room_id 比较）
        if (evRoomId != null && evRoomId !== roomNow.id) return;
        const result = applyHubEvent(roomNow, ev, meIdRef.current);
        roomRef.current = result.room;
        setRoom(result.room);
        result.systemMessages.forEach(appendSystem);
        if (result.kickedSelf) {
          toast({ variant: "destructive", title: "你已被移出房间" });
          handleCloseRoom();
          return;
        }
        if (result.refreshScoresWith != null) void loadScores(roomNow.id, result.refreshScoresWith);
      },
      onState: (state, err) => {
        setConnState(state);
        setLastError(err ?? null);
      },
    });
    return stop;
  }, [user, bindStatus?.bound, appendSystem, handleCloseRoom, loadScores]);

  // ---- 绑定 / 解绑 ----
  const [bindBusy, setBindBusy] = useState(false);
  const handleBind = async () => {
    setBindBusy(true);
    const res = await refApi.getBindUrl();
    setBindBusy(false);
    if (res.ok && res.data.authUrl) {
      window.location.href = res.data.authUrl;
    } else {
      toast({
        variant: "destructive",
        title: "获取授权链接失败",
        description: res.ok ? "未获取到授权地址，请稍后重试" : res.error.message,
      });
    }
  };
  const handleUnbind = async () => {
    if (!window.confirm("确定要解除 osu! 裁判授权绑定吗？")) return;
    setBindBusy(true);
    const res = await refApi.clearBind();
    setBindBusy(false);
    if (res.ok) {
      toast({ title: "已解除绑定" });
      await loadBindStatus();
    } else {
      toast({ variant: "destructive", title: "解除绑定失败", description: res.error.message });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <LoadingBlock label="加载裁判控制台…" />
      </div>
    );
  }
  if (!user) return null; // useEffect 跳转 /register

  const bound = !!bindStatus?.bound;
  const inConsole = bound && (room != null || connState !== "disconnected");

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      {/* 页头 */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-(--pc-ink) md:text-3xl">
            <Gavel className="h-7 w-7 text-pc-primary" /> 裁判控制台
          </h1>
          <p className="mt-1 text-sm text-(--pc-slate)">
            创建/加入 osu! 多人游戏房间并进行执裁：玩家管理、图池队列、比赛控制与实时事件。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bindStatus?.bound && (
            <>
              <Badge variant="teal">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {bindStatus.username || bindStatus.osuId || "已绑定"}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleUnbind} disabled={bindBusy}>
                <Unplug className="h-3.5 w-3.5" /> 解除绑定
              </Button>
            </>
          )}
        </div>
      </header>

      {bindLoading ? (
        <LoadingBlock label="检查绑定状态…" />
      ) : !bound ? (
        /* 未绑定：绑定引导卡片 */
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>绑定 osu! 账号（裁判授权）</CardTitle>
            <CardDescription>
              使用裁判用的 osu! 账号完成授权后，才能连接裁判服务器并管理多人游戏房间。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBind} disabled={bindBusy}>
              {bindBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              绑定 osu! 账号（裁判授权）
            </Button>
          </CardContent>
        </Card>
      ) : !inConsole ? (
        /* 已绑定未连接：连接引导卡片 */
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>连接裁判服务器</CardTitle>
            <CardDescription>
              当前状态：{connState === "connecting" ? "连接中" : "未连接"}
              {lastError ? `（${lastError}）` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              连接裁判服务器
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* 主控制台：三栏布局（左 玩家+比赛控制 / 中 房间或聊天+比分 /右 图池+Mod+事件） */
        <>
          {room && (
            <RefereeTopBar
              room={room}
              connState={connState}
              lastError={lastError}
              onReconnect={handleConnect}
              reconnecting={connecting}
              onCloseRoom={handleCloseRoom}
            />
          )}
          <div className="grid gap-4 py-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
            {/* 左栏 */}
            <div className="flex flex-col gap-4">
              {room ? (
                <>
                  <PlayersPanel room={room} />
                  <MatchControlPanel room={room} />
                </>
              ) : (
                <PlaceholderCard text="创建或加入房间后，在此管理玩家与比赛控制" />
              )}
            </div>

            {/* 中栏 */}
            <div className="flex flex-col gap-4">
              {room ? (
                <>
                  <ChatPanel
                    lines={chatLines}
                    matchStatus={room.status}
                    onSend={(text) => void handleSend(text)}
                  />
                  <ScoresPanel
                    matchType={room.type}
                    teams={Object.fromEntries(
                      Object.values(room.players).map((p) => [p.id, p.team]),
                    )}
                    scores={scores}
                  />
                </>
              ) : (
                <RoomSetup onRoomJoined={handleRoomJoined} />
              )}
            </div>

            {/* 右栏 */}
            <div className="flex flex-col gap-4">
              {room && (
                <>
                  <MapQueuePanel room={room} />
                  <ModSettingsPanel room={room} />
                </>
              )}
              <EventsPanel events={events} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
