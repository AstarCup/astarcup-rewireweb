import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { api, qs } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { MOD_COLORS, modBase } from "@/lib/mods";
import { CATEGORY_OPTIONS, MODS_ORDER, seasonOptions as buildSeasonOptions } from "@/lib/types";
import { osuAvatarUrl } from "@/lib/utils";
import type { MapSelection, MapComment } from "@/lib/types";
import { STAT_FIELDS } from "./stats";

export function CommentDialog({
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
            <p className="py-4 text-center text-xs text-(--pc-faint)">加载评论中…</p>
          ) : comments.length === 0 ? (
            <p className="py-4 text-center text-xs text-(--pc-faint)">暂无评论。</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-xl border-2 border-(--pc-border) p-3">
                <div className="flex items-start gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={c.avatarUrl || osuAvatarUrl(c.userId)} alt={c.username} />
                    <AvatarFallback>{c.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-(--pc-ink)">{c.username}</span>
                      <button
                        onClick={() => void remove(c.id)}
                        disabled={delBusy === c.id}
                        className="text-xs text-pc-primary hover:underline"
                      >
                        {delBusy === c.id ? "…" : "删除"}
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-(--pc-slate)">{c.comment}</p>
                  </div>
                </div>
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

export function BatchApproveDialog({
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
        <div className="max-h-72 overflow-y-auto rounded-xl border-2 border-(--pc-border)">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-(--pc-paper)">
              <tr className="border-b-2 border-(--pc-border)">
                <th className="px-3 py-2 font-bold text-(--pc-slate)">MOD</th>
                <th className="px-3 py-2 font-bold text-(--pc-slate)">歌曲</th>
                <th className="px-3 py-2 font-bold text-(--pc-slate)">难度</th>
                <th className="px-3 py-2 font-bold text-(--pc-slate)">提名者</th>
              </tr>
            </thead>
            <tbody>
              {maps.map((m) => (
                <tr key={m.id} className="border-b border-(--pc-border)/60">
                  <td className="px-3 py-2">
                    <span
                      className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
                    >
                      {`${modBase(m)}${m.modPosition ?? ""}`}
                    </span>
                    {m.selectedMods?.toUpperCase() === "DT" && m.customDTRate != null && (
                      <span className="ml-1 text-xs font-bold text-[#a78bfa]">
                        x{Number(m.customDTRate).toFixed(2)}
                      </span>
                    )}
                    {m.customModName && (
                      <span className="ml-1 text-xs font-bold text-(--pc-slate)">
                        {m.customModName}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-bold text-(--pc-ink)">{m.title}</td>
                  <td className="px-3 py-2 text-(--pc-slate)">{m.version}</td>
                  <td className="px-3 py-2 text-(--pc-faint)">
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

export function AdjustStatsDialog({
  open,
  onOpenChange,
  map,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  map: MapSelection | null;
  onSaved: () => void;
}) {
  const { settings } = useApp();
  const seasonOptions = buildSeasonOptions(settings);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("");
  const [mods, setMods] = useState("NM");
  const [modPosition, setModPosition] = useState("");
  const [customModName, setCustomModName] = useState("");
  const [customDTRate, setCustomDTRate] = useState("");
  const [comment, setComment] = useState("");
  const [mapType, setMapType] = useState<"normal" | "original" | "custom">("normal");

  useEffect(() => {
    if (!map) return;
    setValues({
      star: map.starRating != null ? String(map.starRating) : "",
      ar: map.ar != null ? String(map.ar) : "",
      cs: map.cs != null ? String(map.cs) : "",
      od: map.od != null ? String(map.od) : "",
      hp: map.hp != null ? String(map.hp) : "",
      bpm: map.bpm != null ? String(map.bpm) : "",
      length: map.totalLength != null ? String(map.totalLength) : "",
      maxCombo: map.maxCombo != null ? String(map.maxCombo) : "",
    });
    setSeason(map.season ?? "");
    setCategory(map.category ?? "");
    setMods(modBase(map));
    setModPosition(map.modPosition != null ? String(map.modPosition) : "");
    setCustomModName(map.customModName ?? "");
    setCustomDTRate(map.customDTRate != null ? String(map.customDTRate) : "");
    setComment(map.comment ?? "");
    setMapType(map.isCustome ? "custom" : map.isOrigin ? "original" : "normal");
  }, [map]);

  const save = async () => {
    if (!map) return;
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const body: Record<string, unknown> = {
      starRating: num(values.star),
      ar: num(values.ar),
      cs: num(values.cs),
      od: num(values.od),
      hp: num(values.hp),
      bpm: num(values.bpm),
      totalLength: num(values.length),
      maxCombo: num(values.maxCombo),
    };
    // 赛季/阶段/MOD/MOD 位仅当发生变化时才提交，避免覆盖自定义 MOD 配置
    if (season !== (map.season ?? "")) body.season = season || null;
    if (category !== (map.category ?? "")) body.category = category || null;
    if (mods !== modBase(map)) body.selectedMods = mods;
    if (modPosition !== (map.modPosition != null ? String(map.modPosition) : "")) {
      body.modPosition = modPosition.trim() === "" ? null : Number(modPosition);
    }
    if (customModName !== (map.customModName ?? "")) body.customModName = customModName || null;
    if (customDTRate !== (map.customDTRate != null ? String(map.customDTRate) : "")) {
      body.customDTRate = customDTRate.trim() === "" ? null : Number(customDTRate);
    }
    if (comment !== (map.comment ?? "")) body.comment = comment || null;
    const origType = map.isCustome ? "custom" : map.isOrigin ? "original" : "normal";
    if (mapType !== origType) {
      body.isCustome = mapType === "custom";
      body.isOrigin = mapType === "original";
    }
    setBusy(true);
    const res = await api.patch(`/api/map-selections/${map.id}`, body);
    setBusy(false);
    if (res.ok) {
      toast({ title: "参数已更新" });
      onOpenChange(false);
      onSaved();
    } else {
      toast({ variant: "destructive", title: "更新失败" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" style={{ rotate: "0deg" }}>
        <DialogHeader>
          <DialogTitle>调整参数</DialogTitle>
          <DialogDescription>{map ? `${map.title} - ${map.version}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          <div className="grid gap-1.5">
            <Label>赛季</Label>
            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger>
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
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
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
            <Label>MOD 位</Label>
            <Input value={modPosition} onChange={(e) => setModPosition(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STAT_FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label>{f.label}</Label>
              <Input
                type="number"
                step="any"
                value={values[f.key]}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
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
          <div className="grid gap-1.5">
            <Label>类型</Label>
            <Select
              value={mapType}
              onValueChange={(v) => setMapType(v as "normal" | "original" | "custom")}
            >
              <SelectTrigger>
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
        <div className="grid gap-1.5">
          <Label>备注</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="可选备注"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
