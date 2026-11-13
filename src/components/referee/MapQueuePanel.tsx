import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import ModPicker, { ModIcon } from "@/components/referee/ModPicker";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "@/hooks/use-toast";
import {
  getBeatmapCached,
  hub,
  invokeHub,
  sortedPlaylistItems,
  type OsuBeatmap,
  type RefMod,
  type RefPlaylistItem,
  type RefRoomState,
} from "@/lib/ref";
import { Badge } from "@/components/ui/badge";
import { BusyButton } from "@/components/ui/busy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MappoolPicker from "@/components/referee/MappoolPicker";

const RULESET_NAMES = ["osu!", "taiko", "catch", "mania"];

function rulesetName(id: number): string {
  return RULESET_NAMES[id] ?? `ruleset ${id}`;
}

function BeatmapTitle({ beatmapId }: { beatmapId: number }) {
  const [map, setMap] = useState<OsuBeatmap | null>(null);
  useEffect(() => {
    let alive = true;
    void getBeatmapCached(beatmapId).then((m) => {
      if (alive) setMap(m);
    });
    return () => {
      alive = false;
    };
  }, [beatmapId]);

  return (
    <span className="break-words">
      {map
        ? `${map.beatmapset.artist} - ${map.beatmapset.title} [${map.version}]`
        : `谱面 #${beatmapId}`}
    </span>
  );
}

function mmss(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** 卡片背景封面（osu beatmapset cover，加载后淡入） */
function BeatmapCover({ beatmapId }: { beatmapId: number }) {
  const [map, setMap] = useState<OsuBeatmap | null>(null);
  useEffect(() => {
    let alive = true;
    void getBeatmapCached(beatmapId).then((m) => {
      if (alive) setMap(m);
    });
    return () => {
      alive = false;
    };
  }, [beatmapId]);
  const covers = map?.beatmapset?.covers as Record<string, string> | undefined;
  const url = covers?.["cover@2x"] ?? covers?.cover;
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
    />
  );
}

/** 当前图的关键谱面信息（时长/BPM/星数/CS AR OD HP），照 apl-ref TODO 的 Map Stats */
function BeatmapStats({ beatmapId }: { beatmapId: number }) {
  const [map, setMap] = useState<OsuBeatmap | null>(null);
  useEffect(() => {
    let alive = true;
    void getBeatmapCached(beatmapId).then((m) => {
      if (alive) setMap(m);
    });
    return () => {
      alive = false;
    };
  }, [beatmapId]);
  if (!map) return null;

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const length = num(map.total_length);
  const cs = num(map.cs);
  const ar = num(map.ar);
  // osu! API v2 里 OD=accuracy、HP=drain，兼容旧字段名
  const od = num(map.accuracy) ?? num(map.od);
  const hp = num(map.drain) ?? num(map.hp);
  const items = [
    length != null ? mmss(length) : null,
    num(map.bpm) != null ? `${num(map.bpm)!.toFixed(0)} BPM` : null,
    num(map.difficulty_rating) != null ? `★${num(map.difficulty_rating)!.toFixed(2)}` : null,
    cs != null ? `CS${cs}` : null,
    ar != null ? `AR${ar}` : null,
    od != null ? `OD${od}` : null,
    hp != null ? `HP${hp}` : null,
  ].filter((x): x is string => !!x);

  if (items.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-bold text-(--pc-slate)">
      {items.map((t) => (
        <span key={t} className="rounded bg-(--pc-paper) px-1.5 py-0.5">
          {t}
        </span>
      ))}
    </div>
  );
}

interface PlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RefRoomState;
  /** null = 添加模式；非 null = 编辑该图 */
  editing: RefPlaylistItem | null;
}

function PlaylistDialog({ open, onOpenChange, room, editing }: PlaylistDialogProps) {
  const confirm = useConfirm();
  const [beatmapId, setBeatmapId] = useState("");
  const [rulesetId, setRulesetId] = useState("");
  const [requiredMods, setRequiredMods] = useState<RefMod[]>([]);
  const [allowedMods, setAllowedMods] = useState<RefMod[]>([]);
  const [freestyle, setFreestyle] = useState(false);
  const [busy, setBusy] = useState(false);

  // 打开时按模式回填
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setBeatmapId(String(editing.beatmap_id));
      setRulesetId(String(editing.ruleset_id));
      setRequiredMods(editing.required_mods ?? []);
      setAllowedMods(editing.allowed_mods ?? []);
      setFreestyle(!!editing.freestyle);
    } else {
      setBeatmapId("");
      setRulesetId("0");
      setRequiredMods([]);
      setAllowedMods([]);
      setFreestyle(false);
    }
  }, [open, editing]);

  const submit = async () => {
    const bId = parseInt(beatmapId, 10);
    if (!Number.isFinite(bId) || bId <= 0) {
      toast({ variant: "destructive", title: "请输入有效的 Beatmap ID" });
      return;
    }
    const rId = parseInt(rulesetId, 10);
    const params = {
      beatmap_id: bId,
      ruleset_id: Number.isFinite(rId) ? rId : 0,
      required_mods: requiredMods,
      allowed_mods: allowedMods,
      freestyle,
    };
    setBusy(true);
    const res = editing
      ? await invokeHub(hub.editPlaylistItem(room.id, { playlist_item_id: editing.id, ...params }))
      : await invokeHub(hub.addPlaylistItem(room.id, params));
    setBusy(false);
    if (res.ok) {
      toast({ title: editing ? "图池项已更新" : "已添加图池项" });
      onOpenChange(false);
    } else {
      toast({
        variant: "destructive",
        title: editing ? "更新图池项失败" : "添加图池项失败",
        description: res.error.message,
      });
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (!(await confirm({ title: "确定要从图池移除这张图吗？" }))) return;
    setBusy(true);
    const res = await invokeHub(hub.removePlaylistItem(room.id, editing.id));
    setBusy(false);
    if (res.ok) {
      toast({ title: "已移除图池项" });
      onOpenChange(false);
    } else {
      toast({ variant: "destructive", title: "移除失败", description: res.error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑图池项" : "添加图池项"}</DialogTitle>
          <DialogDescription>点选 mod 并可调整参数；没有选中的 mod 即为不限。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ref-pl-beatmap">Beatmap ID</Label>
            <Input
              id="ref-pl-beatmap"
              type="number"
              value={beatmapId}
              onChange={(e) => setBeatmapId(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ref-pl-ruleset">规则集</Label>
            <Select value={rulesetId} onValueChange={setRulesetId}>
              <SelectTrigger id="ref-pl-ruleset" className="w-full">
                <SelectValue placeholder="选择模式" />
              </SelectTrigger>
              <SelectContent>
                {RULESET_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">必选 mod</Label>
            <ModPicker value={requiredMods} onChange={setRequiredMods} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">允许 mod</Label>
            <ModPicker value={allowedMods} onChange={setAllowedMods} />
          </div>
          <label className="flex items-center gap-2 text-sm text-(--pc-slate)">
            <Checkbox checked={freestyle} onCheckedChange={(v) => setFreestyle(v === true)} />
            Freestyle（允许自由选图）
          </label>
        </div>
        <DialogFooter>
          {editing && (
            <Button variant="destructive" size="sm" onClick={remove} disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" /> 移除
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <BusyButton size="sm" onClick={submit} loading={busy}>
            {editing ? "保存" : "添加"}
          </BusyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MapQueuePanelProps {
  room: RefRoomState;
}

/** 右栏上半：Map Queue（图池队列 + 添加/编辑/移除弹窗） */
export default function MapQueuePanel({ room }: MapQueuePanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RefPlaylistItem | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const items = sortedPlaylistItems(room);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base md:text-lg">图池队列</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setPickOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> 一键 pick
          </Button>
          <Button
            variant="teal"
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> 添加
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-[340px] overflow-y-auto">
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-xl border-2 border-(--pc-border) bg-(--pc-white) shadow-[2px_2px_0px_rgba(0,0,0,0.06)]"
            >
              <BeatmapCover beatmapId={Number(item.beatmap_id)} />
              <div className="relative flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={Number(item.order) === 0 ? "primary" : "outline"}>
                      {rulesetName(Number(item.ruleset_id))}
                    </Badge>
                    {Number(item.order) === 0 && <Badge variant="yellow">当前图</Badge>}
                  </div>
                  <div className="mt-1 text-sm font-bold break-words text-(--pc-ink)">
                    <BeatmapTitle beatmapId={Number(item.beatmap_id)} />
                  </div>
                  <BeatmapStats beatmapId={Number(item.beatmap_id)} />
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-(--pc-slate)">
                    <span className="rounded bg-(--pc-paper) px-1.5 py-0.5">
                      ID {item.beatmap_id}
                    </span>
                    <span className="flex items-center gap-1 rounded bg-(--pc-paper) px-1.5 py-0.5">
                      必选
                      {item.required_mods.length > 0 ? (
                        item.required_mods.map((m) => (
                          <ModIcon key={m.acronym} acronym={m.acronym} className="h-3.5 w-auto" />
                        ))
                      ) : (
                        <span>无</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 rounded bg-(--pc-paper) px-1.5 py-0.5">
                      允许
                      {item.allowed_mods.length > 0 ? (
                        item.allowed_mods.map((m) => (
                          <ModIcon key={m.acronym} acronym={m.acronym} className="h-3.5 w-auto" />
                        ))
                      ) : (
                        <span>无</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 rounded bg-(--pc-paper) px-1.5 py-0.5">
                      Freestyle
                      {item.freestyle ? (
                        <Check className="h-3.5 w-3.5 text-pc-teal" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-pc-primary" />
                      )}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(item);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> 编辑
                </Button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-(--pc-faint)">
              图池为空，点右上角「一键 pick」或「添加」
            </p>
          )}
        </div>
      </CardContent>

      <PlaylistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        room={room}
        editing={editing}
      />
      <MappoolPicker open={pickOpen} onOpenChange={setPickOpen} room={room} />
    </Card>
  );
}
