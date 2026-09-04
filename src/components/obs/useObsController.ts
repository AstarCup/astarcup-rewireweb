import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, qs } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import type { MapSelection } from "@/lib/types";
import {
  bansPerTeam,
  otherTeam,
  type BanPickAction,
  type MatchMode,
  type OBSState,
  type TeamKey,
} from "./types";

const STORAGE_KEY = "obsOverlayState";

export interface CurrentAction {
  team: TeamKey;
  type: BanPickAction;
}

function defaultState(): OBSState {
  const bans = bansPerTeam(5);
  return {
    match: { boFormat: 5, mode: "1v1", matchTitle: "", roomName: "" },
    teams: {
      red: { name: "红方", players: [], score: 0 },
      blue: { name: "蓝方", players: [], score: 0 },
    },
    timer: { running: false, seconds: 0, label: "" },
    banPick: {
      phase: "ban",
      redRemaining: bans,
      blueRemaining: bans,
      picked: [],
      banned: [],
      currentTeam: "red",
    },
    currentActiveMap: null,
    roll: { red: 0, blue: 0, done: false },
    victory: { winner: null },
  };
}

function loadInitial(): OBSState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as Partial<OBSState>;
    const def = defaultState();
    return {
      match: { ...def.match, ...(p.match ?? {}) },
      teams: {
        red: { ...def.teams.red, ...(p.teams?.red ?? {}) },
        blue: { ...def.teams.blue, ...(p.teams?.blue ?? {}) },
      },
      timer: { ...def.timer, ...(p.timer ?? {}) },
      banPick: { ...def.banPick, ...(p.banPick ?? {}) },
      currentActiveMap: p.currentActiveMap ?? null,
      roll: { ...def.roll, ...(p.roll ?? {}) },
      victory: { winner: p.victory?.winner ?? null },
    };
  } catch {
    return defaultState();
  }
}

export function useObsController() {
  const { settings } = useApp();
  const [state, setState] = useState<OBSState>(loadInitial);
  const [currentAction, setCurrentAction] = useState<CurrentAction | null>(null);

  // Track which team banned each beatmap so undo can restore the right counter.
  const banOwner = useRef<Record<number, TeamKey>>({});

  // ---- Persistence ----
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  // ---- Timer tick ----
  useEffect(() => {
    if (!state.timer.running) return;
    const id = setInterval(() => {
      setState((s) =>
        s.timer.running ? { ...s, timer: { ...s.timer, seconds: s.timer.seconds + 1 } } : s,
      );
    }, 1000);
    return () => clearInterval(id);
  }, [state.timer.running]);

  // ---- Map pool loading ----
  const season = settings?.current_season || "s1";
  const [category, setCategory] = useState<string>("全部");
  const [maps, setMaps] = useState<MapSelection[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const loadMaps = useCallback(async () => {
    setMapsLoading(true);
    setMapsError(null);
    const query = qs({
      season,
      approved: true,
      category: category === "全部" ? undefined : category,
    });
    const res = await api.get<MapSelection[]>(`/api/map-selections${query}`);
    if (res.ok) setMaps(res.data);
    else setMapsError(res.error.message);
    setMapsLoading(false);
  }, [season, category]);

  useEffect(() => {
    void loadMaps();
  }, [loadMaps]);

  // ---- Match ----
  const setBoFormat = useCallback((n: number) => {
    const bans = bansPerTeam(n);
    banOwner.current = {};
    setState((s) => ({
      ...s,
      match: { ...s.match, boFormat: n },
      banPick: {
        phase: "ban",
        redRemaining: bans,
        blueRemaining: bans,
        picked: [],
        banned: [],
        currentTeam: "red",
      },
    }));
  }, []);
  const setMode = useCallback((mode: MatchMode) => {
    setState((s) => ({ ...s, match: { ...s.match, mode } }));
  }, []);
  const setMatchTitle = useCallback((v: string) => {
    setState((s) => ({ ...s, match: { ...s.match, matchTitle: v } }));
  }, []);
  const setRoomName = useCallback((v: string) => {
    setState((s) => ({ ...s, match: { ...s.match, roomName: v } }));
  }, []);

  // ---- Teams ----
  const setTeamName = useCallback((team: TeamKey, name: string) => {
    setState((s) => ({ ...s, teams: { ...s.teams, [team]: { ...s.teams[team], name } } }));
  }, []);
  const addPlayer = useCallback((team: TeamKey) => {
    setState((s) => ({
      ...s,
      teams: {
        ...s.teams,
        [team]: { ...s.teams[team], players: [...s.teams[team].players, { username: "", avatarUrl: "" }] },
      },
    }));
  }, []);
  const removePlayer = useCallback((team: TeamKey, index: number) => {
    setState((s) => ({
      ...s,
      teams: {
        ...s.teams,
        [team]: {
          ...s.teams[team],
          players: s.teams[team].players.filter((_, i) => i !== index),
        },
      },
    }));
  }, []);
  const setPlayer = useCallback(
    (team: TeamKey, index: number, field: "username" | "avatarUrl", value: string) => {
      setState((s) => ({
        ...s,
        teams: {
          ...s.teams,
          [team]: {
            ...s.teams[team],
            players: s.teams[team].players.map((p, i) =>
              i === index ? { ...p, [field]: value } : p,
            ),
          },
        },
      }));
    },
    [],
  );

  // ---- Score ----
  const incScore = useCallback((team: TeamKey) => {
    setState((s) => ({
      ...s,
      teams: { ...s.teams, [team]: { ...s.teams[team], score: s.teams[team].score + 1 } },
    }));
  }, []);
  const decScore = useCallback((team: TeamKey) => {
    setState((s) => ({
      ...s,
      teams: {
        ...s.teams,
        [team]: { ...s.teams[team], score: Math.max(0, s.teams[team].score - 1) },
      },
    }));
  }, []);

  // ---- Timer ----
  const timerStart = useCallback(() => {
    setState((s) => ({ ...s, timer: { ...s.timer, running: true } }));
  }, []);
  const timerPause = useCallback(() => {
    setState((s) => ({ ...s, timer: { ...s.timer, running: false } }));
  }, []);
  const timerReset = useCallback(() => {
    setState((s) => ({ ...s, timer: { running: false, seconds: 0, label: s.timer.label } }));
  }, []);
  const setTimerLabel = useCallback((v: string) => {
    setState((s) => ({ ...s, timer: { ...s.timer, label: v } }));
  }, []);
  const quickSetMinutes = useCallback((mins: number) => {
    setState((s) => ({ ...s, timer: { ...s.timer, seconds: Math.max(0, mins * 60) } }));
  }, []);

  // ---- Ban / Pick ----
  const applyAction = useCallback((action: CurrentAction, map: MapSelection) => {
    setState((s) => {
      const bp = s.banPick;
      if (bp.phase === "done") return s;
      if (bp.banned.some((m) => m.id === map.id) || bp.picked.some((m) => m.id === map.id))
        return s;

      if (action.type === "ban") {
        if (bp.phase !== "ban") return s;
        const remaining =
          action.team === "red" ? bp.redRemaining : bp.blueRemaining;
        if (remaining <= 0) return s;
        banOwner.current[map.id] = action.team;
        const banned = [...bp.banned, map];
        const redRemaining = action.team === "red" ? bp.redRemaining - 1 : bp.redRemaining;
        const blueRemaining = action.team === "blue" ? bp.blueRemaining - 1 : bp.blueRemaining;
        const phase: OBSState["banPick"]["phase"] =
          redRemaining + blueRemaining > 0 ? "ban" : "pick";
        return {
          ...s,
          banPick: {
            ...bp,
            banned,
            redRemaining,
            blueRemaining,
            currentTeam: otherTeam(action.team),
            phase,
          },
        };
      }

      // pick
      if (bp.phase !== "pick") return s;
      const target = Math.ceil(s.match.boFormat / 2);
      if (bp.picked.length >= target) return s;
      const picked = [...bp.picked, map];
      const phase: OBSState["banPick"]["phase"] =
        picked.length >= target ? "done" : "pick";
      return {
        ...s,
        banPick: { ...bp, picked, currentTeam: otherTeam(action.team), phase },
        currentActiveMap: map,
      };
    });
  }, []);

  const undoMap = useCallback((map: MapSelection) => {
    setState((s) => {
      const bp = s.banPick;
      const inPicked = bp.picked.some((m) => m.id === map.id);
      if (inPicked) {
        const picked = bp.picked.filter((m) => m.id !== map.id);
        const target = Math.ceil(s.match.boFormat / 2);
        const phase: OBSState["banPick"]["phase"] =
          bp.phase === "done" && picked.length < target ? "pick" : bp.phase;
        return { ...s, banPick: { ...bp, picked, phase } };
      }
      const inBanned = bp.banned.some((m) => m.id === map.id);
      if (inBanned) {
        const banned = bp.banned.filter((m) => m.id !== map.id);
        const owner = banOwner.current[map.id];
        const redRemaining =
          owner === "red" ? Math.min(bp.redRemaining + 1, bansPerTeam(s.match.boFormat)) : bp.redRemaining;
        const blueRemaining =
          owner === "blue"
            ? Math.min(bp.blueRemaining + 1, bansPerTeam(s.match.boFormat))
            : bp.blueRemaining;
        const phase: OBSState["banPick"]["phase"] =
          redRemaining + blueRemaining > 0 ? "ban" : bp.phase === "done" ? "done" : bp.phase;
        return { ...s, banPick: { ...bp, banned, redRemaining, blueRemaining, phase } };
      }
      return s;
    });
  }, []);

  // ---- Roll ----
  const rolledRef = useRef<{ red: boolean; blue: boolean }>({ red: false, blue: false });
  const doRoll = useCallback((team: TeamKey) => {
    const value = Math.floor(Math.random() * 100);
    rolledRef.current[team] = true;
    setState((s) => {
      const done = rolledRef.current.red && rolledRef.current.blue;
      return { ...s, roll: { ...s.roll, [team]: value, done } };
    });
  }, []);
  const resetRoll = useCallback(() => {
    rolledRef.current = { red: false, blue: false };
    setState((s) => ({ ...s, roll: { red: 0, blue: 0, done: false } }));
  }, []);

  // ---- Victory ----
  const setVictory = useCallback((winner: TeamKey | null) => {
    setState((s) => ({ ...s, victory: { winner } }));
  }, []);

  return {
    state,
    maps,
    mapsLoading,
    mapsError,
    loadMaps,
    category,
    setCategory,
    currentAction,
    setCurrentAction,
    setBoFormat,
    setMode,
    setMatchTitle,
    setRoomName,
    setTeamName,
    addPlayer,
    removePlayer,
    setPlayer,
    incScore,
    decScore,
    timerStart,
    timerPause,
    timerReset,
    setTimerLabel,
    quickSetMinutes,
    applyAction,
    undoMap,
    doRoll,
    resetRoll,
    setVictory,
  };
}

export type ObsController = ReturnType<typeof useObsController>;