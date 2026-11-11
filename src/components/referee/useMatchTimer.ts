import { useCallback, useEffect, useRef, useState } from "react";

/** 播报节点（与 apl-ref index.js 的 informTimes 一致） */
const ANNOUNCE_AT = [30, 15, 10, 5];

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

  const start = useCallback(
    (seconds: number) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      clearTick();
      deadlineRef.current = Date.now() + Math.floor(seconds) * 1000;
      setTotal(Math.floor(seconds));
      setRemaining(Math.floor(seconds));
      // 起始值本身不当作节点播报，避免刚发完 "Started..." 又补一条
      announcedRef.current.add(Math.floor(seconds));
      say(`Started a countdown for ${Math.floor(seconds)} seconds`);
      tickRef.current = window.setInterval(() => {
        const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0) {
          say("The countdown has ended.");
          clearTick();
          setTotal(null);
          setRemaining(null);
          return;
        }
        if (!announcedRef.current.has(left) && (ANNOUNCE_AT.includes(left) || left % 60 === 0)) {
          announcedRef.current.add(left);
          say(`The countdown has ${remainingText(left)}`);
        }
      }, 250);
    },
    [clearTick, say],
  );

  const stop = useCallback(
    (announce = true) => {
      const wasRunning = deadlineRef.current > 0;
      clearTick();
      setTotal(null);
      setRemaining(null);
      if (announce && wasRunning) say("Countdown aborted");
    },
    [clearTick, say],
  );

  useEffect(
    () => () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current);
    },
    [],
  );

  return { total, remaining, running: remaining != null, start, stop };
}
