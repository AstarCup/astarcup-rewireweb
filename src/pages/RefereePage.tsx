import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Gavel, Link2, Loader2, Plug, ShieldCheck, Unplug } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { toast } from "@/hooks/use-toast";
import { LoadingBlock } from "@/hooks/useFetch";
import {
  applyHubEvent,
  asNum,
  chatMessageId,
  chatMessageUserId,
  createRoomState,
  hub,
  invokeHub,
  mergeUser,
  refApi,
  subscribeRefEvents,
  type ChatLine,
  type EventLogEntry,
  type OsuChatMessage,
  type OsuUserLite,
  type RefBindStatus,
  type RefConnectionState,
  type RefRoomState,
  type RoomJoinedResponse,
} from "@/lib/ref";
import type { DisplayScore } from "@/lib/types";
import { runChatInput } from "@/components/referee/chatCommands";
import { useMatchTimer } from "@/components/referee/useMatchTimer";
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

/** 上次加入的房间 id：刷新页面 / 切换 staff Tab 后用来恢复房间 */
const LAST_ROOM_KEY = "ref:lastRoom";
/** 房间状态快照（sessionStorage）：刷新后先恢复界面，再靠后端快照判断还能不能 JoinRoom */
const ROOM_STATE_KEY = "ref:roomState";

function loadSavedRoomState(): RefRoomState | null {
  try {
    const raw = sessionStorage.getItem(ROOM_STATE_KEY);
    return raw ? (JSON.parse(raw) as RefRoomState) : null;
  } catch {
    return null;
  }
}

function saveRoomState(state: RefRoomState | null) {
  try {
    if (state) sessionStorage.setItem(ROOM_STATE_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(ROOM_STATE_KEY);
  } catch {
    /* 隐私模式忽略 */
  }
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
  /** 首次 /status 是否已经回来（避免把「还没查」当成「未连接」） */
  const [statusLoaded, setStatusLoaded] = useState(false);
  useEffect(() => {
    if (!bindStatus?.bound) return;
    void (async () => {
      const res = await refApi.getStatus();
      if (res.ok) {
        setConnState(res.data.state);
        setLastError(res.data.lastError ?? null);
      }
      setStatusLoaded(true);
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
  /** 刷新前的房间快照（只在挂载时读一次，避免被空状态覆盖） */
  const savedStateRef = useRef<RefRoomState | null>(loadSavedRoomState());
  const meIdRef = useRef<string | null>(null);
  meIdRef.current = user?.osuId ?? null;

  // ---- 用户资料缓存：房间模型的玩家/裁判只有 ID，资料靠 /api/ref/user 补（照 apl-ref 的 Room.GetUser） ----
  const userCacheRef = useRef(new Map<number, OsuUserLite>());
  const userPendingRef = useRef(new Map<number, Promise<OsuUserLite | null>>());

  const getUserCached = useCallback(async (id: number): Promise<OsuUserLite | null> => {
    if (!Number.isFinite(id) || id <= 0) return null;
    const cached = userCacheRef.current.get(id);
    if (cached) return cached;
    const pending = userPendingRef.current.get(id);
    if (pending) return pending;
    const req = refApi
      .user(id)
      .then((res) => {
        userPendingRef.current.delete(id);
        if (!res.ok || !res.data?.id) return null;
        userCacheRef.current.set(id, res.data);
        return res.data;
      })
      .catch(() => {
        userPendingRef.current.delete(id);
        return null;
      });
    userPendingRef.current.set(id, req);
    return req;
  }, []);

  /** 把缺失资料的用户补进房间状态 */
  const ensureUsers = useCallback(
    (ids: number[]) => {
      const missing = ids.filter((id) => {
        if (!Number.isFinite(id) || id <= 0) return false;
        const r = roomRef.current;
        if (!r) return false;
        const u = r.players[id] ?? r.refs[id];
        return !!u && !u.user;
      });
      for (const id of new Set(missing)) {
        void getUserCached(id).then((u) => {
          const r = roomRef.current;
          if (!u || !r) return;
          const next = mergeUser(r, u);
          roomRef.current = next;
          setRoom(next);
        });
      }
    },
    [getUserCached],
  );

  // ---- 房间倒计时播报（!mp timer / 开始比赛带倒计时） ----
  const timer = useMatchTimer(async (text) => {
    const channel = roomRef.current?.chatChannelId;
    if (channel == null) return false;
    const res = await refApi.sendChat(channel, text);
    if (!res.ok) {
      toast({ variant: "destructive", title: "倒计时播报失败", description: res.error.message });
    }
    return res.ok;
  });
  // 事件回调里只取当前 timer，避免把每秒变化的 remaining 带进 effect 依赖
  const timerRef = useRef(timer);
  timerRef.current = timer;

  // ---- 断线重连提示：断线期间的事件收不到，提醒必要时重新加入 ----
  const prevConnRef = useRef<RefConnectionState>("disconnected");
  useEffect(() => {
    const prev = prevConnRef.current;
    prevConnRef.current = connState;
    if (prev !== "connected" && connState === "connected" && roomRef.current) {
      toast({
        title: "已重新连接裁判服务器",
        description: "断线期间的事件可能缺失，房间状态不对时请重新加入房间。",
      });
    }
  }, [connState]);

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

  const appendUserMessages = useCallback(
    async (msgs: OsuChatMessage[]) => {
      const meId = meIdRef.current;
      const prevMax = lastChatIdRef.current;
      const fresh = msgs.filter((m) => {
        const id = chatMessageId(m);
        return id != null && id > prevMax;
      });
      if (fresh.length === 0) return;
      // 先推进游标再做 await，避免轮询与"发送后回显"并发时重复插入
      lastChatIdRef.current = Math.max(
        prevMax,
        ...fresh.map((m) => chatMessageId(m) ?? 0),
      );

      // 发送者资料：本地没有的先补一次（照 apl-ref 的 Room.GetUser）
      const resolved = new Map<number, OsuUserLite>();
      for (const m of fresh) {
        const uid = chatMessageUserId(m);
        if (uid <= 0 || m.sender || resolved.has(uid)) continue;
        const known = roomRef.current?.players[uid] ?? roomRef.current?.refs[uid];
        if (known?.user) continue;
        if (meId != null && String(uid) === meId) continue;
        const u = await getUserCached(uid);
        if (u) resolved.set(uid, u);
      }

      const roomNow = roomRef.current;
      const additions: ChatLine[] = [];
      for (const msg of fresh) {
        const id = chatMessageId(msg) ?? ++lineIdRef.current + 1000000;
        const uid = chatMessageUserId(msg);
        const known = roomNow?.players[uid] ?? roomNow?.refs[uid];
        const sender = msg.sender;
        const fetched = resolved.get(uid);
        const username =
          known?.user?.username ||
          sender?.username ||
          fetched?.username ||
          (meId != null && String(uid) === meId ? (user?.username ?? "") : "") ||
          `玩家 #${uid}`;
        const avatarUrl =
          known?.user?.avatar_url ?? sender?.avatar_url ?? fetched?.avatar_url ?? null;
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

      // 顺手把消息里带的 / 刚补到的资料并进用户缓存
      const withUsers: OsuUserLite[] = [];
      for (const m of fresh) if (m.sender?.id != null) withUsers.push(m.sender);
      withUsers.push(...resolved.values());
      if (withUsers.length) {
        const current = roomRef.current;
        if (current) {
          let r = current;
          for (const u of withUsers) r = mergeUser(r, u);
          roomRef.current = r;
          setRoom(r);
        }
      }
    },
    [getUserCached, user?.username],
  );

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
    saveRoomState(null);
    try {
      localStorage.removeItem(LAST_ROOM_KEY);
    } catch {
      /* 隐私模式忽略 */
    }
    // 同步清掉后端的房间快照，避免下次刷新又恢复一个已经不存在的房间
    void refApi.clearRoom();
    timerRef.current.stop(false);
  }, []);

  const handleRoomJoined = useCallback(
    (resp: RoomJoinedResponse) => {
      const state = createRoomState(resp);
      roomRef.current = state;
      setRoom(state);
      setScores(null);
      setChatLines([]);
      lastChatIdRef.current = 0;
      // 记住房间，刷新页面 / 切 Tab 回来时可以自动重新加入
      try {
        localStorage.setItem(LAST_ROOM_KEY, String(state.id));
      } catch {
        /* 忽略 */
      }
      // 房间快照里只有 ID，补全玩家/裁判资料（照 apl-ref 构造 Room 时的 GetUser）
      ensureUsers([
        ...(resp.players ?? []).map((p) => p.user_id),
        ...(resp.referees ?? []).map((r) => r.user_id),
      ]);
    },
    [ensureUsers],
  );

  // ---- 刷新/切 Tab 后自动恢复：先重连 hub，再恢复房间 ----
  const autoConnectRef = useRef(false);
  useEffect(() => {
    if (loading || !user || !bindStatus?.bound || !statusLoaded) return;
    if (connState !== "disconnected" || autoConnectRef.current) return;
    autoConnectRef.current = true;
    void (async () => {
      const res = await refApi.connect();
      if (res.ok) {
        setConnState(res.data.state);
        setLastError(res.data.lastError ?? null);
      }
    })();
  }, [loading, user, bindStatus?.bound, statusLoaded, connState]);

  // 房间状态快照：每条事件后写 sessionStorage，刷新后可以原地恢复
  useEffect(() => {
    if (room) saveRoomState(room);
  }, [room]);

  const restoreRef = useRef(false);
  useEffect(() => {
    if (!statusLoaded || connState !== "connected" || room || restoreRef.current) return;
    restoreRef.current = true;
    void (async () => {
      // 1) 后端还记着房间 → 服务端仍认为我们在房间里，此时 JoinRoom 会报
      //    "An unexpected error occurred invoking 'JoinRoom'"；直接恢复快照。
      const cached = await refApi.getRoom();
      const backendRoom = cached.ok ? (cached.data?.room ?? null) : null;
      if (backendRoom) {
        const local = savedStateRef.current;
        if (local && local.id === backendRoom.room_id) {
          roomRef.current = local;
          setRoom(local);
          ensureUsers([
            ...Object.keys(local.players).map(Number),
            ...Object.keys(local.refs).map(Number),
          ]);
          toast({ title: "已恢复房间", description: local.name || `#${local.id}` });
        } else {
          handleRoomJoined(backendRoom);
          toast({ title: "已恢复房间", description: backendRoom.name || `#${backendRoom.room_id}` });
        }
        return;
      }

      // 2) 后端没有房间快照（例如后端重启过）→ 用 JoinRoom 重新加入
      let saved: number | null = null;
      try {
        const raw = localStorage.getItem(LAST_ROOM_KEY);
        saved = raw ? Number(raw) : null;
      } catch {
        /* 忽略 */
      }
      if (saved == null || !Number.isFinite(saved) || saved <= 0) return;

      const res = await invokeHub<RoomJoinedResponse>(hub.joinRoom(saved));
      if (res.ok && res.data) {
        handleRoomJoined(res.data);
        toast({ title: "已重新加入房间", description: res.data.name || `#${saved}` });
        return;
      }
      // 再查一次后端：可能别的标签页刚把手房间恢复了
      const again = await refApi.getRoom();
      const room2 = again.ok ? (again.data?.room ?? null) : null;
      if (room2) {
        handleRoomJoined(room2);
        return;
      }
      try {
        localStorage.removeItem(LAST_ROOM_KEY);
      } catch {
        /* 忽略 */
      }
      saveRoomState(null);
      toast({
        title: "上次的房间已不可用",
        description: res.ok
          ? `房间 #${saved} 可能已关闭，请重新创建/加入`
          : `房间可能已关闭或你已被移出（${res.error.message}）`,
      });
    })();
  }, [statusLoaded, connState, room, handleRoomJoined, ensureUsers]);

  // ---- 聊天轮询（5s，页面隐藏时暂停）与发送 ----
  useEffect(() => {
    const channel = room?.chatChannelId;
    if (!room || channel == null) return;
    let stopped = false;
    let busy = false;
    const poll = async () => {
      if (busy || document.hidden) return;
      busy = true;
      const res = await refApi.getChatMessages(channel, lastChatIdRef.current || undefined);
      busy = false;
      if (stopped || !res.ok || !Array.isArray(res.data)) return;
      void appendUserMessages(res.data);
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
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
        timer: timerRef.current,
      });
      if (handled) return;
      if (roomNow.chatChannelId == null) {
        toast({
          variant: "destructive",
          title: "房间聊天频道未就绪",
          description: "请等待房间加载完成后再发送消息",
        });
        return;
      }
      const res = await refApi.sendChat(roomNow.chatChannelId, text);
      if (res.ok && res.data) {
        void appendUserMessages([res.data]);
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
        const dataObj = (ev.data ?? {}) as Record<string, unknown>;
        // 这些提示跟有没有进房间无关：被邀请当裁判 / 自己被移除裁判权限
        if (ev.event === "RefereeInvited") {
          const rid = asNum(dataObj.room_id);
          toast({ title: "收到裁判邀请", description: rid ? `房间 #${rid}` : undefined });
        }
        if (
          ev.event === "RefereeRemoved" &&
          meIdRef.current != null &&
          String(dataObj.user_id) === meIdRef.current
        ) {
          toast({ variant: "destructive", title: "你已被移除裁判权限" });
        }
        const roomNow = roomRef.current;
        if (!roomNow) return;
        const evRoomId = asNum(dataObj.room_id);
        // 只把当前房间的事件并入状态（照 models.js 的 room_id 比较）
        if (evRoomId != null && evRoomId !== roomNow.id) return;
        const result = applyHubEvent(roomNow, ev, meIdRef.current);
        roomRef.current = result.room;
        setRoom(result.room);
        result.systemMessages.forEach(appendSystem);
        if (result.needUserIds.length) ensureUsers(result.needUserIds);
        // 服务器端倒计时被停掉（含别的裁判操作）时，本地播报也停
        if (ev.event === "CountdownStopped") timerRef.current.stop(false);
        // 比赛开始/结束/中止后倒计时不再播报
        if (
          ev.event === "MatchStarted" ||
          ev.event === "MatchAborted" ||
          ev.event === "MatchCompleted"
        ) {
          timerRef.current.stop(false);
        }
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
  }, [
    user,
    bindStatus?.bound,
    appendSystem,
    handleCloseRoom,
    loadScores,
    ensureUsers,
  ]);

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
        <div className="flex flex-wrap items-center gap-2">
          {bindStatus?.bound && (
            <>
              <Badge
                variant={
                  connState === "connected" ? "teal" : connState === "connecting" ? "yellow" : "primary"
                }
                title={lastError ?? undefined}
              >
                {connState === "connected"
                  ? "裁判服务器已连接"
                  : connState === "connecting"
                    ? "正在连接…"
                    : "未连接"}
              </Badge>
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
                  <MatchControlPanel room={room} timer={timer} />
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
                    meId={user?.osuId ?? null}
                    disabled={room.chatChannelId == null}
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
