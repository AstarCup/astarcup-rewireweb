import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api, qs } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
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
import { fmt } from "@/lib/utils";
import { MODS_ORDER, CATEGORIES } from "@/lib/types";
import type { MapSelection, BeatmapInfo, MapComment } from "@/lib/types";

function osuMapUrl(s: MapSelection): string {
  if (s.url) return s.url;
  return `https://osu.ppy.sh/b/${s.beatmapId}`;
}

function CommentDialog({
  open,
  onOpenChange,
  map,
  onMsg,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  map: MapSelection | null;
  onMsg: (m: string) => void;
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
          const bucket = Object.values(res.data).flat();
          setComments(bucket);
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
      onMsg("评论已添加");
      const c = await api.get<MapComment[]>(
        "/api/map-selections/comments" + qs({ mapSelectionIds: String(map.id) }),
      );
      if (c.ok) setComments(Object.values(c.data).flat());
    } else {
      onMsg("评论失败");
    }
  };

  const remove = async (id: number) => {
    setDelBusy(id);
    const res = await api.delete(`/api/map-selections/comments/${id}`);
    setDelBusy(null);
    if (res.ok) {
      setComments((cs) => cs.filter((c) => c.id !== id));
      onMsg("评论已删除");
    } else {
      onMsg("删除评论失败");
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

export default function MapSelectionManagement() {
  const { user, settings } = useApp();
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("全部");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  const seasonOptions = settings?.availableSeasons ?? [];

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
  }, [season, category, load]);

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

  const parseUrl = async () => {
    if (!bmUrl.trim()) return;
    setParseBusy(true);
    setMsg("");
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
      setMsg("解析失败");
    }
  };

  const pickedInfo = parseResult.find((p) => String(p.id) === picked);

  const addSelection = async () => {
    if (!pickedInfo) {
      setMsg("请先解析并选择难度");
      return;
    }
    setBusy("add");
    setMsg("");
    const res = await api.post("/api/map-selections", {
      selectedBy: user?.osuId ?? "",
      url: pickedInfo.url ?? bmUrl,
      selectedMods: mods,
      modPosition: modPosition || null,
      comment: comment || null,
      approved,
      beatmapId: pickedInfo.id,
      season: season || null,
      category: category === "全部" ? null : category,
    });
    setBusy("");
    if (res.ok) {
      setMsg("选图已添加");
      setAddOpen(false);
      setBmUrl("");
      setParseResult([]);
      setPicked("");
      setComment("");
      setModPosition("");
      setApproved(true);
      void load();
    } else {
      setMsg("添加失败");
    }
  };

  const toggleApproved = async (m: MapSelection) => {
    setBusy(`approved-${m.id}`);
    const res = await api.patch(`/api/map-selections/${m.id}`, {
      approved: !m.approved,
    });
    setBusy("");
    if (res.ok) void load();
    else setMsg("更新失败");
  };

  const togglePadding = async (m: MapSelection) => {
    setBusy(`padding-${m.id}`);
    const res = await api.patch(`/api/map-selections/${m.id}`, {
      padding: !m.padding,
    });
    setBusy("");
    if (res.ok) void load();
    else setMsg("更新失败");
  };

  const removeMap = async (m: MapSelection) => {
    setBusy(`delete-${m.id}`);
    const res = await api.delete(`/api/map-selections/${m.id}`);
    setBusy("");
    if (res.ok) {
      setMsg("选图已删除");
      void load();
    } else {
      setMsg("删除失败");
    }
  };

  const bulkApprove = async (approvedFlag: boolean) => {
    if (selectedIds.size === 0) {
      setMsg("请先勾选选图");
      return;
    }
    setBusy("bulk");
    setMsg("");
    const res = await api.post<{ total: number; success: number; failed: number }>(
      "/api/map-selections/bulk-approve",
      { selectionIds: Array.from(selectedIds), approved: approvedFlag },
    );
    setBusy("");
    if (res.ok) {
      setMsg(`批量完成：成功 ${res.data.success} / 总 ${res.data.total}`);
      setSelectedIds(new Set());
      void load();
    } else {
      setMsg("批量操作失败");
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

  const [commentTarget, setCommentTarget] = useState<MapSelection | null>(null);

  if (loading) return <LoadingBlock label="加载选图中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle tag="选图管理" accent="#f5c040" className="mb-0">
          图池维护
        </SectionTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="primary">添加选图</Button>
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
            <SelectTrigger className="w-36">
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
          <Label className="text-xs text-[#b0a898]">分类</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-32">
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
        <div className="ml-auto flex gap-2">
          <Button
            variant="teal"
            size="sm"
            onClick={() => void bulkApprove(true)}
            disabled={busy === "bulk" || selectedIds.size === 0}
          >
            批量通过
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void bulkApprove(false)}
            disabled={busy === "bulk" || selectedIds.size === 0}
          >
            批量取消审核
          </Button>
        </div>
      </div>

      {msg && (
        <Badge variant={msg.includes("失败") ? "primary" : "teal"} className="mt-4">
          {msg}
        </Badge>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-[#b0a898]">
        <Badge variant="outline">{selectedIds.size} 已选</Badge>
        <span>当前筛选：{season || "全部赛季"} / {category}</span>
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#b0a898]">没有符合条件的选图。</p>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex flex-wrap items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.id)}
                  onChange={() => toggleSelect(m.id)}
                  className="mt-1 h-4 w-4 accent-[#e85d75]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#2d2d2d]">
                      {m.artist ? `${m.artist} - ` : ""}
                      {m.title}
                      <span className="text-[#b0a898]"> [{m.version}]</span>
                    </span>
                    <Badge variant={m.approved ? "teal" : "yellow"}>
                      {m.approved ? "已审核" : "待审核"}
                    </Badge>
                    {m.padding && <Badge variant="blue">padding</Badge>}
                    <Badge variant="outline">★{fmt(m.starRating)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#666666]">
                    分类：{m.category || "-"} · 赛季：{m.season || "-"} · MOD：{m.selectedMods || "-"} ·{" "}
                    位置：{m.modPosition || "-"}
                  </p>
                  {m.comment && <p className="mt-1 text-xs text-[#b0a898]">备注：{m.comment}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => void toggleApproved(m)}>
                    {m.approved ? "取消审核" : "通过审核"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void togglePadding(m)}
                  >
                    {m.padding ? "取消 padding" : "标为 padding"}
                  </Button>
                  <Button
                    variant="yellow"
                    size="sm"
                    onClick={() => setCommentTarget(m)}
                  >
                    评论
                  </Button>
                  <a
                    href={osuMapUrl(m)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center rounded-lg border-2 border-[#e0d8cc] bg-white px-3 text-xs font-bold text-[#6b7fb5] shadow-[2px_2px_0px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5"
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
          ))}
        </div>
      )}

      <CommentDialog
        open={!!commentTarget}
        onOpenChange={(o) => !o && setCommentTarget(null)}
        map={commentTarget}
        onMsg={setMsg}
      />
    </div>
  );
}