import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CheckSquare, LayoutGrid, LayoutList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { useAsync } from "@/hooks/useFetch";
import { LoadingBlock, ErrorBlock } from "@/components/paper/feedback";
import { api, qs } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { cn, fmt } from "@/lib/utils";
import {
  MODS_ORDER,
  CATEGORY_OPTIONS,
  CATEGORY_LABEL,
  seasonLabel,
  seasonOptions as buildSeasonOptions,
} from "@/lib/types";
import type {
  MapSelection,
  BeatmapInfo,
  MapComment,
  ModStatsResult,
  StaffStats,
} from "@/lib/types";

import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { MOD_DISPLAY, modBase } from "@/lib/mods";
import { StageStatCard, STAT_FIELDS } from "./mappool/stats";
import { CommentDialog, BatchApproveDialog, AdjustStatsDialog } from "./mappool/dialogs";
import { groupMaps } from "./mappool/helpers";
import { MapCardView, MapTableView, type MapViewActions } from "./mappool/views";

/** 列表视图排序用的 MOD 顺序（未列出的 mod 排在最后） */
const MOD_LIST_ORDER: readonly string[] = ["NM", "HD", "HR", "DT", "LZ", "TB"];

export default function MapSelectionManagement() {
  const { user, settings } = useApp();
  // 与图池页共用 mappool_init：首次载入自动同步到当前赛季，之后保持用户选择
  const [init] = useState(() => {
    const done = localStorage.getItem("mappool_init") === "true";
    try {
      localStorage.setItem("mappool_init", "true");
    } catch {
      /* ignore */
    }
    return done;
  });
  const [season, setSeason] = useState<string>(() => localStorage.getItem("mappool_season") ?? "");
  const [category, setCategory] = useState<string>(
    () => localStorage.getItem("mappool_category") ?? "qualification",
  );
  const [modFilter, setModFilter] = useState("全部");
  const [paddingFilter, setPaddingFilter] = useState("全部");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"card" | "table">("card");
  const [visible, setVisible] = useState(60);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [commentsByMap, setCommentsByMap] = useState<Record<string, MapComment[]>>({});
  const [statsOpen, setStatsOpen] = useState(false);

  const seasonOptions = buildSeasonOptions(settings);

  // 拉取后台统计（用于阶段统计卡片 / HoverCard）
  const { data: staffStats, run: loadStats } = useAsync<StaffStats>();
  useEffect(() => {
    void loadStats(() => api.get<StaffStats>("/api/staff/stats"));
  }, [loadStats]);

  // 当前选中赛季 + 阶段对应的统计数据（类别为“全部”时展示该赛季全部阶段）
  const seasonStatRows = useMemo(
    () => staffStats?.seasonMappoolStats?.[season] ?? [],
    [staffStats, season],
  );
  const statRows = useMemo(() => {
    if (seasonStatRows.length === 0) return [];
    if (category === "全部") return seasonStatRows;
    return seasonStatRows.filter((r) => r.category === category);
  }, [seasonStatRows, category]);

  // 仅在第一次载入时同步赛季到当前赛季（未设置时取最新），并持久化；之后保持用户选择
  useEffect(() => {
    if (init) return;
    const cur = settings?.current_season;
    if (cur && seasonOptions.some((o) => o.value === cur)) {
      localStorage.setItem("mappool_season", cur);
      setSeason(cur);
    } else if (seasonOptions.length > 0) {
      const fallback = seasonOptions[seasonOptions.length - 1].value;
      localStorage.setItem("mappool_season", fallback);
      setSeason(fallback);
    }
  }, [settings, seasonOptions, init]);

  const seasonReady = init || !!settings?.seasons || !!settings?.current_season;

  const { data, loading, error, run } = useAsync<MapSelection[]>();
  const load = useCallback(
    () =>
      run(() =>
        api.get<MapSelection[]>(
          "/api/map-selections" +
            qs({
              season: season || undefined,
              category: category === "全部" ? undefined : category,
            }),
        ),
      ),
    [run, season, category],
  );

  useEffect(() => {
    if (!seasonReady) return;
    void load();
  }, [seasonReady, load]);

  // 数据刷新后清理已不存在的选择，避免批量操作带上过期 id
  useEffect(() => {
    if (!data) return;
    setSelectedIds((prev) => {
      const valid = new Set(data.map((m) => m.id));
      let needsPrune = false;
      for (const id of prev) {
        if (!valid.has(id)) {
          needsPrune = true;
          break;
        }
      }
      if (!needsPrune) return prev;
      return new Set([...prev].filter((id) => valid.has(id)));
    });
  }, [data]);

  // Batch-fetch comments for the visible pool.
  useEffect(() => {
    const maps = data ?? [];
    if (maps.length === 0) {
      setCommentsByMap({});
      return;
    }
    void api
      .get<Record<string, MapComment[]>>(
        "/api/map-selections/comments" + qs({ mapSelectionIds: maps.map((m) => m.id).join(",") }),
      )
      .then((res) => {
        if (res.ok) setCommentsByMap(res.data);
      });
  }, [data]);

  // 搜索支持：普通文字 / BID / SID，以及参数过滤（cs/ar/od/hp/bpm/时长/maxcombo/star，运算符 > < = >= <=）与 bid:/sid: 前缀；用空格或分号分隔多个条件，如 ar>6;cs=5;bid:114514
  const filtered = useMemo(() => {
    const maps = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) {
      return maps.filter((m) => {
        if (modFilter !== "全部" && modBase(m) !== modFilter) return false;
        if (paddingFilter === "测图中" && !m.padding) return false;
        if (paddingFilter === "非测图" && m.padding) return false;
        return true;
      });
    }

    const paramRe = /^(cs|ar|od|hp|bpm|length|时长|maxcombo|star)\s*([><=]+)\s*([\d.]+)$/;
    const keyRe = /^(bid|sid)\s*[:：]\s*([\d]+)$/;
    const seasonRe = /^season\s*[:：]\s*([\w]+)$/;
    const paramTokens: { key: string; op: string; val: number }[] = [];
    const keyTokens: { key: "bid" | "sid"; val: string }[] = [];
    const seasonTokens: string[] = [];
    const textTokens: string[] = [];
    for (const tok of q.split(/[\s;]+/)) {
      if (!tok) continue;
      const pm = tok.match(paramRe);
      if (pm) {
        paramTokens.push({ key: pm[1], op: pm[2], val: Number(pm[3]) });
        continue;
      }
      const km = tok.match(keyRe);
      if (km) {
        keyTokens.push({ key: km[1] as "bid" | "sid", val: km[2] });
        continue;
      }
      const sm = tok.match(seasonRe);
      if (sm) {
        seasonTokens.push(sm[1].toLowerCase());
        continue;
      }
      textTokens.push(tok);
    }

    const fieldOf = (key: string, m: MapSelection): number | null | undefined => {
      switch (key) {
        case "cs":
          return m.cs;
        case "ar":
          return m.ar;
        case "od":
          return m.od;
        case "hp":
          return m.hp;
        case "bpm":
          return m.bpm;
        case "length":
        case "时长":
          return m.totalLength;
        case "maxcombo":
          return m.maxCombo;
        case "star":
          return m.starRating;
        default:
          return null;
      }
    };
    const cmp = (v: number, op: string, target: number): boolean => {
      switch (op) {
        case ">":
          return v > target;
        case "<":
          return v < target;
        case ">=":
          return v >= target;
        case "<=":
          return v <= target;
        case "=":
        case "==":
          return v === target;
        default:
          return false;
      }
    };

    return maps.filter((m) => {
      if (modFilter !== "全部" && modBase(m) !== modFilter) return false;
      if (paddingFilter === "测图中" && !m.padding) return false;
      if (paddingFilter === "非测图" && m.padding) return false;
      // 参数过滤：任一不满足即排除
      for (const p of paramTokens) {
        const v = fieldOf(p.key, m);
        if (v == null || !cmp(v, p.op, p.val)) return false;
      }
      // bid:/sid: 过滤：任一不匹配即排除
      for (const k of keyTokens) {
        const sv = k.key === "bid" ? String(m.beatmapId) : String(m.beatmapsetId ?? "");
        if (sv !== k.val) return false;
      }
      // season: 过滤：任一不匹配即排除
      for (const s of seasonTokens) {
        if ((m.season ?? "").toLowerCase() !== s) return false;
      }
      if (textTokens.length === 0) return true;
      const hay = [
        m.title,
        m.artist,
        m.version,
        m.creator,
        m.selectedMods,
        m.modPosition,
        `${modBase(m)}${m.modPosition ?? ""}`,
        m.comment,
        String(m.beatmapId),
        String(m.beatmapsetId ?? ""),
        m.selectedByUsername,
        m.selectedBy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return textTokens.every((t) => hay.includes(t));
    });
  }, [data, modFilter, paddingFilter, search]);

  // 懒加载：筛选条件变化时重置为初始条数
  useEffect(() => {
    setVisible(60);
  }, [filtered]);

  // 排序：先按 MOD 顺序（NM/HD/HR/DT/LZ/TB），再按 MOD 位，最后按添加时间
  const sorted = useMemo(() => {
    const maps = filtered.slice();
    const order = MOD_LIST_ORDER;
    return maps.sort((a, b) => {
      const ia = order.indexOf(modBase(a));
      const ib = order.indexOf(modBase(b));
      if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      const pa = Number(a.modPosition ?? 0);
      const pb = Number(b.modPosition ?? 0);
      if (pa !== pb) return pa - pb;
      return (a.selectedAt ?? a.createdAt ?? "").localeCompare(b.selectedAt ?? b.createdAt ?? "");
    });
  }, [filtered]);

  const lazyList = useMemo(() => sorted.slice(0, visible), [sorted, visible]);
  const groups = useMemo(() => groupMaps(lazyList), [lazyList]);

  const modFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of data ?? []) {
      const k = modBase(m);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const order = MODS_ORDER as readonly string[];
    return [
      { key: "全部", label: `全部 (${data?.length ?? 0})` },
      ...Array.from(counts.entries())
        .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
        .map(([k, n]) => ({ key: k, label: `${MOD_DISPLAY[k] ?? k} ${n} 张` })),
    ];
  }, [data]);

  const paddingCount = data?.filter((m) => m.padding).length ?? 0;

  const unapprovedFiltered = filtered.filter((m) => !m.approved);
  const allSelected =
    unapprovedFiltered.length > 0 && unapprovedFiltered.every((m) => selectedIds.has(m.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const m of unapprovedFiltered) next.delete(m.id);
      } else {
        for (const m of unapprovedFiltered) next.add(m.id);
      }
      return next;
    });
  };

  // Add selection dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [bmUrl, setBmUrl] = useState("");
  const [parseResult, setParseResult] = useState<BeatmapInfo[]>([]);
  const [parseBusy, setParseBusy] = useState(false);
  const [picked, setPicked] = useState("");
  const [mods, setMods] = useState<string>(MODS_ORDER[0]);
  const [modPosition, setModPosition] = useState("");
  const [comment, setComment] = useState("");
  const [approved, setApproved] = useState(false);
  const [addSeason, setAddSeason] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [mapType, setMapType] = useState<"normal" | "original" | "custom">("normal");
  const [modStats, setModStats] = useState<ModStatsResult["modStats"] | null>(null);
  const [calcBusy, setCalcBusy] = useState(false);
  const [customModName, setCustomModName] = useState("");
  const [customDTRate, setCustomDTRate] = useState("");
  const [formStats, setFormStats] = useState<Record<string, string>>({
    star: "",
    ar: "",
    cs: "",
    od: "",
    hp: "",
    bpm: "",
    length: "",
    maxCombo: "",
  });

  const parseUrl = async () => {
    if (!bmUrl.trim()) return;
    setParseBusy(true);
    const res = await api.post<BeatmapInfo[]>("/api/beatmaps/parse-url", {
      url: bmUrl.trim(),
      osu_id: user?.osuId ?? "",
    });
    setParseBusy(false);
    if (res.ok) {
      setParseResult(res.data);
      setPicked(res.data[0] ? String(res.data[0].id) : "");
    } else {
      setParseResult([]);
      toast({ variant: "destructive", title: "解析失败" });
    }
  };

  const pickedInfo = parseResult.find((p) => String(p.id) === picked);

  // 选中难度时用解析结果初始化表单参数
  useEffect(() => {
    if (!pickedInfo) return;
    setFormStats({
      star: pickedInfo.star_rating != null ? String(pickedInfo.star_rating) : "",
      ar: pickedInfo.ar != null ? String(pickedInfo.ar) : "",
      cs: pickedInfo.cs != null ? String(pickedInfo.cs) : "",
      od: pickedInfo.od != null ? String(pickedInfo.od) : "",
      hp: pickedInfo.hp != null ? String(pickedInfo.hp) : "",
      bpm: pickedInfo.bpm != null ? String(pickedInfo.bpm) : "",
      length: pickedInfo.total_length != null ? String(pickedInfo.total_length) : "",
      maxCombo: pickedInfo.maxCombo != null ? String(pickedInfo.maxCombo) : "",
    });
  }, [pickedInfo]);

  // 解析后即时重复检测：相同 BID / SID / 歌曲名
  const duplicateInfo = useMemo(() => {
    if (!pickedInfo) return null;
    const maps = data ?? [];
    const sameBid = maps.filter((m) => m.beatmapId === pickedInfo.id).length;
    const sameSid = maps.filter(
      (m) => pickedInfo.beatmapsetId != null && m.beatmapsetId === pickedInfo.beatmapsetId,
    ).length;
    const sameTitle = maps.filter((m) => pickedInfo.title && m.title === pickedInfo.title).length;
    const parts: string[] = [];
    if (sameBid > 0) parts.push(`BID 重复 ${sameBid} 张`);
    if (sameSid > 0) parts.push(`SID 重复 ${sameSid} 张`);
    if (sameTitle > 0) parts.push(`歌曲重复 ${sameTitle} 张`);
    return parts.length > 0 ? parts.join("，") : null;
  }, [pickedInfo, data]);

  const calculateModStats = async () => {
    if (!pickedInfo) return;
    setCalcBusy(true);
    const res = await api.post<ModStatsResult>("/api/beatmaps/mod-stats", {
      beatmap: pickedInfo,
      mods,
      customSettings: {
        customModName: customModName || null,
        customDTRate: customDTRate ? Number(customDTRate) : null,
      },
    });
    setCalcBusy(false);
    if (res.ok) {
      setModStats(res.data.modStats);
      const s = res.data.modStats;
      setFormStats({
        star: String(s.starRating),
        ar: String(s.ar),
        cs: String(s.cs),
        od: String(s.od),
        hp: String(s.hp),
        bpm: String(s.bpm),
        length: String(s.totalLength),
        maxCombo: String(s.maxCombo),
      });
      toast({ title: "Mod 属性已计算" });
    } else {
      toast({ variant: "destructive", title: "计算失败" });
    }
  };

  const addSelection = async () => {
    if (!pickedInfo) {
      toast({ title: "请先解析并选择难度" });
      return;
    }
    setBusy("add");
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const res = await api.post("/api/map-selections", {
      selectedBy: user?.osuId ?? "",
      url: pickedInfo.url ?? bmUrl,
      selectedMods: mods,
      modPosition: modPosition ? Number(modPosition) : null,
      comment: comment || null,
      approved,
      moddedStats: {
        ar: num(formStats.ar),
        cs: num(formStats.cs),
        od: num(formStats.od),
        hp: num(formStats.hp),
        bpm: num(formStats.bpm),
        totalLength: num(formStats.length),
        maxCombo: num(formStats.maxCombo),
        starRating: num(formStats.star),
      },
      customModName: customModName || undefined,
      customDTRate: customDTRate ? Number(customDTRate) : undefined,
      beatmapId: pickedInfo.id,
      beatmapsetId: pickedInfo.beatmapsetId,
      season: addSeason || null,
      category: addCategory || null,
      isOrigin: mapType === "original",
      isCustome: mapType === "custom",
    });
    setBusy("");
    if (res.ok) {
      toast({ title: "选图已添加" });
      setAddOpen(false);
      setBmUrl("");
      setParseResult([]);
      setPicked("");
      setComment("");
      setModPosition("");
      setApproved(false);
      setModStats(null);
      setCustomModName("");
      setCustomDTRate("");
      void load();
    } else {
      toast({ variant: "destructive", title: "添加失败" });
    }
  };

  const toggleApproved = async (m: MapSelection) => {
    setBusy(`approved-${m.id}`);
    const res = await api.patch(`/api/map-selections/${m.id}`, { approved: !m.approved });
    setBusy("");
    if (res.ok) void load();
    else toast({ variant: "destructive", title: "更新失败" });
  };

  const togglePadding = async (m: MapSelection) => {
    setBusy(`padding-${m.id}`);
    const res = await api.patch(`/api/map-selections/${m.id}`, { padding: !m.padding });
    setBusy("");
    if (res.ok) void load();
    else toast({ variant: "destructive", title: "更新失败" });
  };

  const removeMap = async (m: MapSelection) => {
    setBusy(`delete-${m.id}`);
    const res = await api.delete(`/api/map-selections/${m.id}`);
    setBusy("");
    setDeleteTarget(null);
    if (res.ok) {
      toast({ title: "选图已删除" });
      void load();
    } else {
      toast({ variant: "destructive", title: "删除失败" });
    }
  };

  const confirmBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBusy("bulk");
    const res = await api.post<{ total: number; success: number; failed: number }>(
      "/api/map-selections/bulk-approve",
      { selectionIds: Array.from(selectedIds), approved: true },
    );
    setBusy("");
    if (res.ok) {
      toast({ title: `批量完成：成功 ${res.data.success} / 总 ${res.data.total}` });
      setSelectedIds(new Set());
      setBatchOpen(false);
      void load();
    } else {
      toast({ variant: "destructive", title: "批量操作失败" });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyBid = (m: MapSelection) => {
    void navigator.clipboard
      .writeText(String(m.beatmapId))
      .then(() => toast({ title: "已复制 BID", description: String(m.beatmapId) }))
      .catch(() => toast({ variant: "destructive", title: "复制失败" }));
  };

  const [commentTarget, setCommentTarget] = useState<MapSelection | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<MapSelection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MapSelection | null>(null);

  if (!seasonReady || loading) return <LoadingBlock label="加载选图中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  const selectedMaps = data.filter((m) => selectedIds.has(m.id));

  const viewActions: MapViewActions = {
    onComment: setCommentTarget,
    onToggleApproved: (m) => void toggleApproved(m),
    onTogglePadding: (m) => void togglePadding(m),
    onAdjust: setAdjustTarget,
    onDelete: setDeleteTarget,
    onCopyBid: copyBid,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-(--pc-ink)">选图管理</h2>
          <p className="mt-1 text-xs text-(--pc-faint)">
            共 {data.length} 张选图 · {paddingCount} 张审图中
          </p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o);
            if (o) {
              setAddSeason(seasonOptions[seasonOptions.length - 1]?.value ?? "");
            } else {
              setModStats(null);
              setCustomModName("");
              setCustomDTRate("");
              setAddSeason("");
              setMapType("normal");
              setFormStats({
                star: "",
                ar: "",
                cs: "",
                od: "",
                hp: "",
                bpm: "",
                length: "",
                maxCombo: "",
              });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="primary">+ 添加选图</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl" style={{ rotate: "0deg" }}>
            <DialogHeader>
              <DialogTitle>添加选图</DialogTitle>
              <DialogDescription>粘贴 osu 谱面链接，解析后选择难度与 MOD。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 overflow-y-auto pr-1 max-h-[62vh]">
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>赛季</Label>
                  <Select value={addSeason} onValueChange={setAddSeason}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择赛季" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasonOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>阶段</Label>
                  <Select value={addCategory} onValueChange={setAddCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择阶段" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>类型</Label>
                  <Select
                    value={mapType}
                    onValueChange={(v) => setMapType(v as "normal" | "original" | "custom")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">普通谱面</SelectItem>
                      <SelectItem value="original">原创图</SelectItem>
                      <SelectItem value="custom">定制图</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 grid gap-1.5">
                  <Label>谱面链接</Label>
                  <Input
                    value={bmUrl}
                    onChange={(e) => setBmUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void parseUrl();
                    }}
                    placeholder="https://osu.ppy.sh/b/..."
                  />
                </div>
                <Button variant="teal" onClick={parseUrl} disabled={parseBusy || !bmUrl.trim()}>
                  {parseBusy ? "解析中…" : "解析"}
                </Button>
              </div>
              {parseResult.length > 0 && (
                <div className="grid gap-1.5">
                  <Label>选择难度</Label>
                  <Select value={picked} onValueChange={setPicked}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parseResult.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.title} - {b.version} ★{fmt(b.star_rating)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {pickedInfo && (
                <div className="flex items-center gap-3 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3">
                  {pickedInfo.cover_url ? (
                    <img
                      src={pickedInfo.cover_url}
                      alt={pickedInfo.title}
                      className="h-16 w-28 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-28 shrink-0 place-items-center rounded-lg bg-pc-yellow/30 text-xs font-bold text-(--pc-ink)">
                      无封面
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-sm text-(--pc-ink)">
                      {[pickedInfo.artist, pickedInfo.title].filter(Boolean).join(" - ") ||
                        "未知曲目"}
                    </p>
                    <p className="truncate text-xs text-(--pc-faint)">
                      [{pickedInfo.version}] by {pickedInfo.creator ?? "-"}
                    </p>
                    {pickedInfo.star_rating != null && (
                      <p className="mt-1 text-xs font-bold text-pc-primary">
                        ★ {fmt(pickedInfo.star_rating)}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {duplicateInfo && (
                <p className="rounded-xl border-2 border-pc-yellow bg-pc-yellow/20 px-3 py-2 text-xs font-bold text-(--pc-ink)">
                  ⚠ 检测到重复选图：{duplicateInfo}
                </p>
              )}
              {pickedInfo && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>MOD</Label>
                    <Select value={mods} onValueChange={setMods}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODS_ORDER.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>MOD 位置</Label>
                    <Input value={modPosition} onChange={(e) => setModPosition(e.target.value)} />
                  </div>
                </div>
              )}
              {pickedInfo && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {STAT_FIELDS.map((f) => (
                      <div key={f.key} className="grid gap-1.5">
                        <Label>{f.label}</Label>
                        <Input
                          type="number"
                          step="any"
                          value={formStats[f.key]}
                          onChange={(e) => setFormStats((s) => ({ ...s, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>自定义 Mod 名（可选）</Label>
                      <Input
                        value={customModName}
                        onChange={(e) => setCustomModName(e.target.value)}
                        placeholder="如 LZ"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>自定义 DT 倍率（可选）</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customDTRate}
                        onChange={(e) => setCustomDTRate(e.target.value)}
                        placeholder="如 1.5"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="teal" onClick={calculateModStats} disabled={calcBusy}>
                      {calcBusy ? "计算中…" : "计算 MOD 属性"}
                    </Button>
                    {modStats && (
                      <span className="text-xs text-(--pc-slate)">
                        星级 {fmt(modStats.starRating)} · AR {fmt(modStats.ar)} · CS{" "}
                        {fmt(modStats.cs)} · OD {fmt(modStats.od)}
                      </span>
                    )}
                  </div>
                </>
              )}
              <div className="grid gap-1.5">
                <Label>备注</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="可选备注"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button variant="primary" onClick={addSelection} disabled={busy === "add"}>
                {busy === "add" ? "提交中…" : "添加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 第一行：搜索与视图切换 */}
      <div className="flex items-center gap-3">
        <HoverCard openDelay={150} closeDelay={0}>
          <HoverCardTrigger asChild>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索 BID / 曲名 / 谱师…"
              className="flex-1"
            />
          </HoverCardTrigger>
          <HoverCardContent side="bottom" align="start" className="w-120">
            <p className="mb-1.5 text-xs font-bold text-(--pc-ink)">搜索支持的参数</p>
            <ul className="space-y-1 text-xs leading-relaxed text-(--pc-slate)">
              <li>• 数字：BID / SID（谱面集 ID）</li>
              <li>• 文字：曲名、艺术家、难度、谱师</li>
              <li>• MOD：NM、HD、HR、DT、LZ、TB…</li>
              <li>• 组合：MOD + 位号，如 NM1、HD2</li>
              <li>
                • 属性：cs/ar/od/hp/bpm/时长/maxcombo/star + 运算符，如 cs=6、ar&gt;8、bpm&lt;200
              </li>
              <li>• 前缀：bid:、sid:、season:，如 bid:114514、season:s2</li>
              <li>• 分隔：空格或分号组合多种条件，如 ar&gt;6;cs=5;season:s2;songtitle</li>
              <li>• 其他：备注、提名者用户名</li>
            </ul>
          </HoverCardContent>
        </HoverCard>
        <div className="flex items-center gap-1 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-1 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
          {(["card", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
                view === v
                  ? "bg-pc-blue text-pc-cream"
                  : "bg-transparent text-(--pc-slate) hover:text-(--pc-ink)",
              )}
            >
              {v === "card" ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <LayoutList className="h-4 w-4" />
              )}
              {v === "card" ? "卡片" : "列表"}
            </button>
          ))}
        </div>
      </div>

      {/* 第二行：筛选条件 */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">赛季</Label>
          <Select
            value={season}
            onValueChange={(v) => {
              localStorage.setItem("mappool_season", v);
              setSeason(v);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {seasonOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">类别</Label>
          <Select
            value={category}
            onValueChange={(v) => {
              localStorage.setItem("mappool_category", v);
              setCategory(v);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">All</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">MOD</Label>
          <Select value={modFilter} onValueChange={setModFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modFilterOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">审图状态</Label>
          <Select value={paddingFilter} onValueChange={setPaddingFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              <SelectItem value="测图中">审图中</SelectItem>
              <SelectItem value="非测图">非审图</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <HoverCard openDelay={150} closeDelay={0}>
            <HoverCardTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatsOpen(true)}
                className="gap-1.5"
              >
                <BarChart3 className="h-4 w-4" />
                统计
              </Button>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" align="end" className="w-auto p-0">
              {statRows.length > 0 ? (
                <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-3">
                  {statRows.map((r) => (
                    <StageStatCard key={r.category} row={r} />
                  ))}
                </div>
              ) : (
                <p className="p-4 text-xs text-(--pc-faint)">暂无该阶段的统计数据</p>
              )}
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-(--pc-faint)">
        <Badge variant="outline">{selectedIds.size} 已选</Badge>
        <span>
          当前筛选：{season || "全部赛季"} / {category} / {modFilter} / {paddingFilter} · 共{" "}
          {filtered.length} 张{lazyList.length < filtered.length && `（已显示 ${lazyList.length}）`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={unapprovedFiltered.length === 0}
          >
            <CheckSquare className="h-4 w-4" />
            {allSelected ? "取消全选" : `一键全选 (${unapprovedFiltered.length})`}
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="teal" size="sm" onClick={() => setBatchOpen(true)}>
              批量过审 ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-(--pc-faint)">
          {data.length === 0 ? "暂无选图" : "没有符合筛选条件的选图"}
        </p>
      ) : view === "table" ? (
        <MapTableView maps={lazyList} actions={viewActions} />
      ) : (
        <MapCardView
          groups={groups}
          commentsByMap={commentsByMap}
          category={category}
          season={season}
          settings={settings}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          actions={viewActions}
        />
      )}

      {lazyList.length < filtered.length && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => setVisible((v) => v + 60)}>
            加载更多（{lazyList.length} / {filtered.length}）
          </Button>
        </div>
      )}

      <BatchApproveDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        maps={selectedMaps}
        onConfirm={() => void confirmBulkApprove()}
        busy={busy === "bulk"}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除选图</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「
              {[deleteTarget?.artist, deleteTarget?.title].filter(Boolean).join(" - ") ||
                deleteTarget?.version ||
                "该选图"}
              」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy.startsWith("delete-")}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && void removeMap(deleteTarget)}
              disabled={busy.startsWith("delete-")}
            >
              {busy.startsWith("delete-") ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CommentDialog
        open={!!commentTarget}
        onOpenChange={(o) => !o && setCommentTarget(null)}
        map={commentTarget}
      />

      <AdjustStatsDialog
        open={!!adjustTarget}
        onOpenChange={(o) => !o && setAdjustTarget(null)}
        map={adjustTarget}
        onSaved={load}
      />

      {/* 阶段统计弹窗（点击统计按钮打开） */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {category === "全部" ? "All Stages" : (CATEGORY_LABEL[category] ?? category)} Stats
            </DialogTitle>
            <DialogDescription>
              {season ? `赛季 ${seasonLabel(settings, season)}` : "全部赛季"} 图池统计数据
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
            {statRows.length > 0 ? (
              statRows.map((r) => <StageStatCard key={r.category} row={r} />)
            ) : (
              <p className="py-4 text-center text-xs text-(--pc-faint)">暂无该阶段的统计数据</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
