import { useCallback, useEffect, useRef, useState } from "react";

/** 播报节点（与 apl-ref index.js 的 informTimes 一致） */
const ANNOUNCE_AT = [30, 15, 10, 5];

/** 倒计时持久化（sessionStorage）：刷新页面 / 切换 Tab 重挂载后接着倒 */
const TIMER_KEY = "ref:matchTimer";

interface SavedTimer {
  total: number;
  endsAt: number;
}

function loadSavedTimer(): SavedTimer | null {
  try {
    const raw = sessionStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as SavedTimer) : null;
  } catch {
    return null;
  }
}

function saveTimer(t: SavedTimer | null) {
  try {
    if (t) sessionStorage.setItem(TIMER_KEY, JSON.stringify(t));
    else sessionStorage.removeItem(TIMER_KEY);
  } catch {
    /* 隐私模式忽略 */
  }
}

function remainingText(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0 && s > 0) return `${m} minutes ${s} seconds remaining.`;
  if (m > 0) return `${m} minutes remaining.`;
  return `${s} seconds remaining.`;
}

export interface MatchTimer {
  /** 本次倒计时总秒数（未跑时为 null） */
  total: number | null;
  /** 剩余秒数（未跑时为 null） */
  remaining: number | null;
  running: boolean;
  /** 开始倒计时（会在房间聊天里播报，照 apl-ref 的 !mp timer） */
  start: (seconds: number) => void;
  /** 停止倒计时；announce=false 用于比赛开始/结束时静默清掉 */
  stop: (announce?: boolean) => void;
}

/**
 * 房间倒计时播报：本地 1 秒一跳，同时在 osu! 房间聊天里播报开始、
 * 30/15/10/5 秒与整分钟节点、结束 —— 对应 apl-ref 的 startTimer()。
 *
 * 结束时间戳写入 sessionStorage：刷新页面或切换 staff Tab 导致重挂载时自动恢复，
 * 剩余时间按墙钟计算，不会因刷新重置。
 */
export function useMatchTimer(
  send: (text: string) => Promise<boolean> | boolean | void,
): MatchTimer {
  const sendRef = useRef(send);
  sendRef.current = send;

  const [total, setTotal] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const deadlineRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const announcedRef = useRef(new Set<number>());

  const say = useCallback((text: string) => {
    try {
      void sendRef.current(text);
    } catch {
      /* 聊天发送失败不影响倒计时 */
    }
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    deadlineRef.current = 0;
    announcedRef.current.clear();
  }, []);

  /** 按 deadlineRef 启动跳秒循环（start 与刷新恢复共用） */
  const runTicking = useCallback(() => {
    if (tickRef.current != null) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        say("The countdown has ended.");
        clearTick();
        setTotal(null);
        setRemaining(null);
        saveTimer(null);
        return;
      }
      if (!announcedRef.current.has(left) && (ANNOUNCE_AT.includes(left) || left % 60 === 0)) {
        announcedRef.current.add(left);
        say(`The countdown has ${remainingText(left)}`);
      }
    }, 250);
  }, [clearTick, say]);

  const start = useCallback(
    (seconds: number) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      clearTick();
      const whole = Math.floor(seconds);
      deadlineRef.current = Date.now() + whole * 1000;
      setTotal(whole);
      setRemaining(whole);
      // 起始值本身不当作节点播报，避免刚发完 "Started..." 又补一条
      announcedRef.current.add(whole);
      saveTimer({ total: whole, endsAt: deadlineRef.current });
      say(`Started a countdown for ${whole} seconds`);
      runTicking();
    },
    [clearTick, say, runTicking],
  );

  const stop = useCallback(
    (announce = true) => {
      const wasRunning = deadlineRef.current > 0;
      clearTick();
      setTotal(null);
      setRemaining(null);
      saveTimer(null);
      if (announce && wasRunning) say("Countdown aborted");
    },
    [clearTick, say],
  );

  // 挂载时恢复进行中的倒计时（刷新 / 切 Tab 后重进）
  useEffect(() => {
    const saved = loadSavedTimer();
    if (!saved) return;
    const leftMs = saved.endsAt - Date.now();
    if (leftMs <= 0) {
      saveTimer(null);
      return;
    }
    const left = Math.ceil(leftMs / 1000);
    deadlineRef.current = saved.endsAt;
    announcedRef.current.add(left);
    setTotal(saved.total);
    setRemaining(left);
    runTicking();
    // 恢复时不用重复播报 "Started..."
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current);
    },
    [],
  );

  return { total, remaining, running: remaining != null, start, stop };
}
