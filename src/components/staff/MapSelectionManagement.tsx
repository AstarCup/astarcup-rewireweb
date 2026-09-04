import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  CircleArrowRight,
  Clipboard,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api, qs } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { cn, fmt } from "@/lib/utils";
import { MODS_ORDER, CATEGORIES, seasonOptions as buildSeasonOptions } from "@/lib/types";
import type { MapSelection, BeatmapInfo, MapComment, ModStatsResult } from "@/lib/types";

const MOD_COLORS: Record<string, string> = {
  NM: "#6b7fb5",
  HD: "#f5c040",
  HR: "#e85d75",
  DT: "#a78bfa",
  FM: "#5cb8a5",
  LZ: "#ec6ba8",
  TB: "#2d2d2d",
};

const MOD_DISPLAY: Record<string, string> = {
  NM: "No Mod",
  HD: "Hidden",
  HR: "Hard Rock",
  DT: "Double Time",
  FM: "Free Mod",
  LZ: "Lazer Mod",
  TB: "Tiebreaker",
};

function modBase(m: MapSelection): string {
  return (m.selectedMods ?? "NM").split("+")[0].toUpperCase() || "NM";
}

function modLabel(m: MapSelection): string {
  const pos = m.modPosition ?? "";
  if (m.customModName) return `${m.customModName}${pos}`;
  if (m.selectedMods?.toUpperCase() === "DT" && m.customDTRate) {
    return `DT${pos}-${Number(m.customDTRate).toFixed(2)}x`;
  }
  return `${m.selectedMods ?? "NM"}${pos}`;
}

function starColor(s: number | null): string {
  const v = s ?? 0;
  if (v < 2) return "#4a90d9";
  if (v < 3.5) return "#5cb8a5";
  if (v < 5) return "#f5c040";
  if (v < 6.5) return "#e85d75";
  if (v < 8) return "#a78bfa";
  return "#7c3aed";
}

function fmtLength(seconds: number | null): string {
  if (seconds == null) return "-";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function osuMapUrl(s: MapSelection): string {
  if (s.url) return s.url;
  return `https://osu.ppy.sh/b/${s.beatmapId}`;
}

function groupMaps(list: MapSelection[]): { mod: string; items: MapSelection[] }[] {
  const map = new Map<string, MapSelection[]>();
  for (const m of list) {
    const key = modBase(m);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  const order = MODS_ORDER as readonly string[];
  const keys = Array.from(map.keys()).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return keys.map((mod) => ({ mod, items: map.get(mod)! }));
}

function CommentDialog({
  open,
  onOpenChange,
  map,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  map: MapSelection | null;
}) {
  const [comments, setComments] = useState<MapComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [postBusy, setPostBusy] = useState(false);
  const [delBusy, setDelBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !map) return;
    setLoading(true);
    void api
      .get<Record<string, MapComment[]>>(
        "/api/map-selections/comments" + qs({ mapSelectionIds: String(map.id) }),
      )
      .then((res) => {
        setLoading(false);
        if (res.ok) {
          setComments(Object.values(res.data).flat());
        } else {
          setComments([]);
        }
      });
  }, [open, map]);

  const add = async () => {
    if (!map || !text.trim()) return;
    setPostBusy(true);
    const res = await api.post(`/api/map-selections/${map.id}/comments`, {
      comment: text.trim(),
    });
    setPostBusy(false);
    if (res.ok) {
      setText("");
      toast({ title: "评论已添加" });
      const c = await api.get<MapComment[]>(
        "/api/map-selections/comments" + qs({ mapSelectionIds: String(map.id) }),
      );
      if (c.ok) setComments(Object.values(c.data).flat());
    } else {
      toast({ variant: "destructive", title: "评论失败" });
    }
  };

  const remove = async (id: number) => {
    setDelBusy(id);
    const res = await api.delete(`/api/map-selections/comments/${id}`);
    setDelBusy(null);
    if (res.ok) {
      setComments((cs) => cs.filter((c) => c.id !== id));
      toast({ title: "评论已删除" });
    } else {
      toast({ variant: "destructive", title: "删除评论失败" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>选图评论</DialogTitle>
          <DialogDescription>{map ? `${map.title} - ${map.version}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loading ? (
            <p className="py-4 text-center text-xs text-[#b0a898]">加载评论中…</p>
          ) : comments.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#b0a898]">暂无评论。</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-xl border-2 border-[#e0d8cc] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2d2d2d]">{c.username}</span>
                  <button
                    onClick={() => void remove(c.id)}
                    disabled={delBusy === c.id}
                    className="text-xs text-[#e85d75] hover:underline"
                  >
                    {delBusy === c.id ? "…" : "删除"}
                  </button>
                </div>
                <p className="mt-1 text-sm text-[#666666]">{c.comment}</p>
              </div>
            ))
          )}
          <Separator />
          <div className="grid gap-1.5">
            <Label>添加评论</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="写下评论…"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">关闭</Button>
          </DialogClose>
          <Button variant="primary" onClick={add} disabled={postBusy || !text.trim()}>
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchApproveDialog({
  open,
  onOpenChange,
  maps,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  maps: MapSelection[];
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量过审确认</DialogTitle>
          <DialogDescription>将下列 {maps.length} 张选图标记为已审核。</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-xl border-2 border-[#e0d8cc]">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#fdf6ee]">
              <tr className="border-b-2 border-[#e0d8cc]">
                <th className="px-3 py-2 font-bold text-[#666666]">MOD</th>
                <th className="px-3 py-2 font-bold text-[#666666]">歌曲</th>
                <th className="px-3 py-2 font-bold text-[#666666]">难度</th>
                <th className="px-3 py-2 font-bold text-[#666666]">提名者</th>
              </tr>
            </thead>
            <tbody>
              {maps.map((m) => (
                <tr key={m.id} className="border-b border-[#e0d8cc]/60">
                  <td className="px-3 py-2">
                    <span
                      className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
                    >
                      {modLabel(m)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-bold text-[#2d2d2d]">{m.title}</td>
                  <td className="px-3 py-2 text-[#666666]">{m.version}</td>
                  <td className="px-3 py-2 text-[#b0a898]">
                    {m.selectedByUsername || m.selectedBy || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? "处理中…" : `确认过审 ${maps.length} 张`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MapSelectionManagement() {
  const { user, settings } = useApp();
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("全部");
  const [modFilter, setModFilter] = useState("全部");
  const [paddingFilter, setPaddingFilter] = useState("全部");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"card" | "table">("card");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [commentsByMap, setCommentsByMap] = useState<Record<string, MapComment[]>>({});

  const seasonOptions = buildSeasonOptions(settings);

  const { data, loading, error, load } = useFetch<MapSelection[]>(() =>
    api.get(
      "/api/map-selections" +
        qs({
          season: season || undefined,
          category: category === "全部" ? undefined : category,
        }),
    ),
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, category]);

  // Batch-fetch comments for the visible pool.
  useEffect(() => {
    const maps = data ?? [];
    if (maps.length === 0) {
      setCommentsByMap({});
      return;
    }
    void api
      .get<Record<string, MapComment[]>>(
        "/api/map-selections/comments" +
          qs({ mapSelectionIds: maps.map((m) => m.id).join(",") }),
      )
      .then((res) => {
        if (res.ok) setCommentsByMap(res.data);
      });
  }, [data]);

  const filtered = useMemo(() => {
    const maps = data ?? [];
    return maps.filter((m) => {
      if (modFilter !== "全部" && modBase(m) !== modFilter) return false;
      if (paddingFilter === "测图中" && !m.padding) return false;
      if (paddingFilter === "非测图" && m.padding) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const num = Number(q);
      if (Number.isFinite(num) && q !== "") {
        if (String(m.beatmapId) === q || String(m.beatmapsetId ?? "") === q) return true;
      }
      const hay = [
        m.title,
        m.artist,
        m.version,
        m.creator,
        m.selectedMods,
        m.modPosition,
        m.comment,
        String(m.beatmapId),
        String(m.beatmapsetId ?? ""),
        m.selectedByUsername,
        m.selectedBy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, modFilter, paddingFilter, search]);

  const groups = useMemo(() => groupMaps(filtered), [filtered]);

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
        .sort((a, b) => (order.indexOf(a[0]) - order.indexOf(b[0])))
        .map(([k, n]) => ({ key: k, label: `${MOD_DISPLAY[k] ?? k} ${n} 张` })),
    ];
  }, [data]);

  const paddingCount = data?.filter((m) => m.padding).length ?? 0;

  const unapprovedFiltered = filtered.filter((m) => !m.approved);
  const allSelected = unapprovedFiltered.length > 0 && unapprovedFiltered.every((m) => selectedIds.has(m.id));

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
  const [approved, setApproved] = useState(true);
  const [modStats, setModStats] = useState<ModStatsResult["modStats"] | null>(null);
  const [calcBusy, setCalcBusy] = useState(false);
  const [customModName, setCustomModName] = useState("");
  const [customDTRate, setCustomDTRate] = useState("");

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
    const res = await api.post("/api/map-selections", {
      selectedBy: user?.osuId ?? "",
      url: pickedInfo.url ?? bmUrl,
      selectedMods: mods,
      modPosition: modPosition ? Number(modPosition) : null,
      comment: comment || null,
      approved,
      moddedStats: modStats ?? undefined,
      customModName: customModName || undefined,
      customDTRate: customDTRate ? Number(customDTRate) : undefined,
      beatmapId: pickedInfo.id,
      season: season || null,
      category: category === "全部" ? null : category,
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
      setApproved(true);
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

  if (loading) return <LoadingBlock label="加载选图中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  const selectedMaps = data.filter((m) => selectedIds.has(m.id));

  const statCell = (label: string, value: string, color?: string) => (
    <div className="rounded-xl bg-[#fdf6ee] px-2 py-1.5 text-center">
      <p className="text-[10px] text-[#b0a898]">{label}</p>
      <p className="font-sans text-sm font-bold" style={{ color: color ?? "#2d2d2d" }}>
        {value}
      </p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-[#2d2d2d]">选图管理</h2>
          <p className="mt-1 text-xs text-[#b0a898]">共 {data.length} 张选图 · {paddingCount} 张测图中</p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o);
            if (!o) {
              setModStats(null);
              setCustomModName("");
              setCustomDTRate("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="primary">+ 添加选图</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>添加选图</DialogTitle>
              <DialogDescription>粘贴 osu 谱面链接，解析后选择难度与 MOD。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
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
                  <div className="grid grid-flow-col gap-3">
                    <div className="flex-1 grid gap-1.5">
                      <Label>MOD 位置</Label>
                      <Input value={modPosition} onChange={(e) => setModPosition(e.target.value)} />
                    </div>
                    <div className="grid content-center gap-1.5">
                      <Label>已审核</Label>
                      <input
                        type="checkbox"
                        checked={approved}
                        onChange={(e) => setApproved(e.target.checked)}
                        className="h-5 w-5 accent-[#e85d75]"
                      />
                    </div>
                  </div>
                </div>
              )}
              {pickedInfo && (
                <>
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
                      <span className="text-xs text-[#666666]">
                        星级 {fmt(modStats.starRating)} · AR {fmt(modStats.ar)} · CS {fmt(modStats.cs)} · OD{" "}
                        {fmt(modStats.od)}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#b0a898]">赛季</Label>
          <Select value={season} onValueChange={setSeason}>
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
          <Label className="text-xs text-[#b0a898]">类别</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#b0a898]">MOD</Label>
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
          <Label className="text-xs text-[#b0a898]">测图状态</Label>
          <Select value={paddingFilter} onValueChange={setPaddingFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              <SelectItem value="测图中">测图中</SelectItem>
              <SelectItem value="非测图">非测图</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索 BID / 曲名 / 谱师…"
          className="w-56"
        />
        <Button variant="outline" size="sm" onClick={toggleSelectAll} disabled={unapprovedFiltered.length === 0}>
          <CheckSquare className="h-4 w-4" />
          {allSelected ? "取消全选" : `一键全选 (${unapprovedFiltered.length})`}
        </Button>
        {selectedIds.size > 0 && (
          <Button variant="teal" size="sm" onClick={() => setBatchOpen(true)}>
            批量过审 ({selectedIds.size})
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-xl border-2 border-[#e0d8cc] bg-white p-1 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
          {(["card", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
                view === v
                  ? "bg-[#6b7fb5] text-[#fdf6ee]"
                  : "bg-transparent text-[#666666] hover:text-[#2d2d2d]",
              )}
            >
              {v === "card" ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              {v === "card" ? "卡片" : "列表"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 flex items-center gap-2 text-xs text-[#b0a898]">
        <Badge variant="outline">{selectedIds.size} 已选</Badge>
        <span>
          当前筛选：{season || "全部赛季"} / {category} / {modFilter} / {paddingFilter} · 共{" "}
          {filtered.length} 张
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#b0a898]">
          {data.length === 0 ? "暂无选图" : "没有符合筛选条件的选图"}
        </p>
      ) : view === "table" ? (
        /* ---------- Table view ---------- */
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e0d8cc] bg-[#fdf6ee]">
                <th className="px-3 py-2.5 font-bold text-[#666666]">MOD</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">BID</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">歌曲</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">谱师</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">★</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">CS</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">AR</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">OD</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">BPM</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">时长</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">状态</th>
                <th className="px-3 py-2.5 font-bold text-[#666666]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-[#e0d8cc]/60 hover:bg-[#fdf6ee]">
                  <td className="px-3 py-2.5">
                    <span
                      className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
                    >
                      {modLabel(m)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[#e85d75]">{m.beatmapId}</td>
                  <td className="px-3 py-2.5 font-bold text-[#2d2d2d]">
                    {[m.artist, m.title].filter(Boolean).join(" - ")}
                    <span className="text-[#b0a898]"> [{m.version}]</span>
                  </td>
                  <td className="px-3 py-2.5 text-[#666666]">{m.creator ?? "-"}</td>
                  <td className="px-3 py-2.5 font-sans font-bold" style={{ color: starColor(m.starRating) }}>
                    {fmt(m.starRating)}
                  </td>
                  <td className="px-3 py-2.5 font-sans text-[#666666]">{fmt(m.cs)}</td>
                  <td className="px-3 py-2.5 font-sans text-[#666666]">{fmt(m.ar)}</td>
                  <td className="px-3 py-2.5 font-sans text-[#666666]">{fmt(m.od)}</td>
                  <td className="px-3 py-2.5 font-sans text-[#666666]">{m.bpm ?? "-"}</td>
                  <td className="px-3 py-2.5 font-sans text-[#666666]">{fmtLength(m.totalLength)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {m.approved ? (
                        <Badge variant="teal">已审核</Badge>
                      ) : (
                        <Badge variant="yellow">待审核</Badge>
                      )}
                      {m.padding && <Badge variant="blue">padding</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" onClick={() => void toggleApproved(m)}>
                        {m.approved ? "取消审核" : "通过"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void togglePadding(m)}>
                        {m.padding ? "去 padding" : "padding"}
                      </Button>
                      <Button variant="yellow" size="sm" onClick={() => setCommentTarget(m)}>
                        评论
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => void removeMap(m)}>
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ---------- Card view (grouped by MOD) ---------- */
        <div className="mt-4 flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.mod}>
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="rounded-xl px-3 py-1 text-sm font-bold text-white shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: MOD_COLORS[g.mod] ?? "#666" }}
                >
                  {MOD_DISPLAY[g.mod] ?? g.mod}
                </span>
                <span className="text-xs text-[#666666]">{g.items.length} 张图</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {g.items.map((m) => {
                  const comments = commentsByMap[String(m.id)] ?? [];
                  const modColor = MOD_COLORS[modBase(m)] ?? "#666";
                  return (
                    <Card
                      key={m.id}
                      className={cn(
                        "group relative overflow-hidden p-0",
                        m.approved && "border-l-8",
                      )}
                      style={m.approved ? { borderLeftColor: "#5cb8a5" } : undefined}
                    >
                      {/* Cover strip */}
                      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-[#5cb8a5]/40 to-[#6b7fb5]/40">
                        {m.coverUrl && (
                          <img src={m.coverUrl} alt="" className="h-full w-full object-cover" />
                        )}
                        {m.approved && (
                          <span className="absolute right-3 top-2 rounded-lg bg-[#5cb8a5]/90 px-2 py-0.5 text-xs font-bold text-[#fdf6ee]">
                            过审
                          </span>
                        )}
                        {m.padding && (
                          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-[#e0a47e]/90 px-2 py-0.5 text-xs font-bold text-[#2d2d2d]">
                            <CircleArrowRight className="h-3.5 w-3.5" />
                            测图中
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                              style={{ backgroundColor: modColor }}
                            >
                              {modLabel(m)}
                            </span>
                            {category === "全部" && m.category && (
                              <Badge variant="outline">{m.category}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {!m.approved && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(m.id)}
                                onChange={() => toggleSelect(m.id)}
                                className="h-4 w-4 accent-[#e85d75]"
                                title="批量选择"
                              />
                            )}
                            <button
                              onClick={() => copyBid(m)}
                              title="复制 BID"
                              className="grid h-7 w-7 place-items-center rounded-full bg-[#fdf6ee] text-[#b0a898] transition hover:text-[#e85d75]"
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <p className="mt-2 line-clamp-2 font-bold text-[#2d2d2d]">
                          {[m.artist, m.title].filter(Boolean).join(" - ") || "未知曲目"}
                        </p>
                        <p className="text-xs text-[#b0a898]">
                          [{m.version}] by {m.creator ?? "-"}
                        </p>

                        {/* Stats */}
                        <div className="mt-3 grid grid-cols-4 gap-1.5">
                          {statCell("CS", fmt(m.cs))}
                          {statCell("AR", fmt(m.ar))}
                          {statCell("OD", fmt(m.od))}
                          {statCell("HP", fmt(m.hp))}
                          {statCell("时长", fmtLength(m.totalLength))}
                          {statCell("MaxCombo", m.maxCombo != null ? String(m.maxCombo) : "-")}
                          {statCell("BPM", m.bpm != null ? String(m.bpm) : "-")}
                          {statCell("★", fmt(m.starRating), starColor(m.starRating))}
                        </div>

                        {/* Nominator */}
                        <div className="mt-3 flex items-center gap-2">
                          {m.selectedByAvatar ? (
                            <img
                              src={m.selectedByAvatar}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="grid h-6 w-6 place-items-center rounded-full bg-[#f5c040]/30 text-[10px] font-bold text-[#2d2d2d]">
                              {(m.selectedByUsername || m.selectedBy || "?").slice(0, 1)}
                            </div>
                          )}
                          <span className="text-xs text-[#666666]">
                            {m.selectedByUsername || m.selectedBy || "未知提名者"}
                          </span>
                        </div>

                        {/* Note */}
                        {m.comment && (
                          <p className="mt-2 rounded-lg bg-[#fdf6ee] px-2 py-1 text-xs text-[#b0a898]">
                            备注：{m.comment}
                          </p>
                        )}

                        {/* Comments preview */}
                        {comments.length > 0 && (
                          <button
                            onClick={() => setCommentTarget(m)}
                            className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#fdf6ee] px-2 py-1 text-left"
                          >
                            {comments.slice(0, 2).map((c) => (
                              <span key={c.id} className="text-[10px] text-[#666666]">
                                {c.username}: {c.comment.slice(0, 18)}
                                {c.comment.length > 18 ? "…" : ""}
                              </span>
                            ))}
                            {comments.length > 2 && (
                              <span className="text-[10px] font-bold text-[#e85d75]">
                                +{comments.length - 2}
                              </span>
                            )}
                          </button>
                        )}

                        {/* Actions */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => void toggleApproved(m)}>
                            {m.approved ? "取消审核" : "通过审核"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void togglePadding(m)}>
                            {m.padding ? "取消 padding" : "标为 padding"}
                          </Button>
                          <Button variant="yellow" size="sm" onClick={() => setCommentTarget(m)}>
                            评论
                          </Button>
                          <a
                            href={osuMapUrl(m)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center rounded-lg border-2 border-[#e0d8cc] bg-white px-3 text-xs font-bold text-[#6b7fb5] shadow-[2px_2px_0px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5"
                          >
                            打开 osu
                          </a>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void removeMap(m)}
                            disabled={busy === `delete-${m.id}`}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <BatchApproveDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        maps={selectedMaps}
        onConfirm={() => void confirmBulkApprove()}
        busy={busy === "bulk"}
      />

      <CommentDialog
        open={!!commentTarget}
        onOpenChange={(o) => !o && setCommentTarget(null)}
        map={commentTarget}
      />
    </div>
  );
}
