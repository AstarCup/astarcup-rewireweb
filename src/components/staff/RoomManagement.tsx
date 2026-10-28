import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronsUpDown } from "lucide-react";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
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
import type { MatchRoom } from "@/lib/types";
import { useCurrentSeason, useSeasonOptions } from "@/lib/seasons";
import SeasonSelect from "@/components/staff/SeasonSelect";

const EMPTY_FORM = {
  room_name: "",
  round_number: "",
  match_date: "",
  match_time: "",
  match_number: "",
  max_participants: "",
  description: "",
};

const MORNING_TIMES = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30"];

const AFTERNOON_TIMES = Array.from({ length: (22 - 13) * 2 + 1 }, (_, i) => {
  const total = 13 * 60 + i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

const ROUND_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "QUA" },
  { value: "2", label: "RO16" },
  { value: "3", label: "QF" },
  { value: "4", label: "SF" },
  { value: "5", label: "F" },
  { value: "6", label: "GF" },
];

const STAGE_LABEL: Record<string, string> = {
  "1": "QUA",
  "2": "RO16",
  "3": "QF",
  "4": "SF",
  "5": "F",
  "6": "GF",
};

const ALL_TIMES = [...MORNING_TIMES, ...AFTERNOON_TIMES];

/** 小并发映射：批量请求既不要串行慢，也不要一次打 25/50 个 */
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index], index);
    }
  });
  await Promise.all(workers);
}

function formatMatchTime(iso?: string | null): string {
  if (!iso) return "-";
  // 后端将本地(+8)墙钟时间按 UTC 序列化(后缀 +00:00)，此处按 +08:00 墙钟解析，避免偏移 8 小时
  const naive = iso.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const d = new Date(`${naive}+08:00`);
  if (Number.isNaN(d.getTime())) return "-";
  const s = d.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [datePart, timePart = ""] = s.split(" ");
  const [y, m, day] = datePart.split("/");
  return `${y}年${m}月${day}日 ${timePart}`;
}

export default function RoomManagement() {
  const { data, loading, error, load } = useFetch<MatchRoom[]>(() => api.get("/api/rooms"));
  const currentSeason = useCurrentSeason();
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);
  // 默认只看当前赛季；选「全部赛季」时展示所有房间
  const activeSeason = seasonFilter ?? currentSeason;
  const seasonOptions = useSeasonOptions((data ?? []).map((r) => r.season));
  const rooms = useMemo(
    () =>
      (data ?? []).filter(
        (r) => activeSeason === "all" || (r.season ?? "").toLowerCase() === activeSeason,
      ),
    [data, activeSeason],
  );
  const [newRoomSeason, setNewRoomSeason] = useState("");
  const [batchSeason, setBatchSeason] = useState("");
  const [seasonBusy, setSeasonBusy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dateObj, setDateObj] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDateObj, setBatchDateObj] = useState<Date | undefined>(undefined);
  const [batchDateOpen, setBatchDateOpen] = useState(false);
  const [batchStage, setBatchStage] = useState("");
  const [batchMax, setBatchMax] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<MatchRoom | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<Set<number>>(new Set());
  const [batchDelBusy, setBatchDelBusy] = useState(false);
  const [batchDelProgress, setBatchDelProgress] = useState(0);

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const statusVariant = (s: string) =>
    s === "full" ? "primary" : s === "closed" ? "outline" : "teal";

  const createRoom = async () => {
    // 后端 CreateRoomBody 的 match_date/match_time 为非可选字符串，且 parse_dt
    // 只接受 "%Y-%m-%dT%H:%M:%S" 或纯日期，因此这里发完整 ISO 时间（date 取当天 00:00）。
    if (!form.room_name.trim()) {
      toast({ variant: "destructive", title: "请填写房间名称" });
      return;
    }
    if (!form.match_date || !form.match_time) {
      toast({ variant: "destructive", title: "请选择日期与时间" });
      return;
    }
    setBusy(true);
    const res = await api.post("/api/rooms", {
      room_name: form.room_name,
      round_number: form.round_number ? Number(form.round_number) : 1,
      match_date: `${form.match_date}T00:00:00`,
      match_time: `${form.match_date}T${form.match_time}:00`,
      match_number: form.match_number ? Number(form.match_number) : 1,
      max_participants: form.max_participants ? Number(form.max_participants) : 2,
      description: form.description || null,
      season: newRoomSeason || currentSeason || undefined,
    });
    setBusy(false);
    if (res.ok) {
      toast({ title: "房间已创建" });
      setOpen(false);
      setForm(EMPTY_FORM);
      setDateObj(undefined);
      void load();
    } else {
      toast({ variant: "destructive", title: "创建失败" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDelBusy(true);
    const res = await api.delete(`/api/rooms/${deleteTarget.id}`);
    setDelBusy(false);
    setDeleteTarget(null);
    if (res.ok) {
      toast({ title: "房间已删除" });
      void load();
    } else {
      toast({ variant: "destructive", title: "删除失败" });
    }
  };

  const toggleDeleteId = (id: number) =>
    setDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleDeleteAll = () =>
    setDeleteIds((prev) =>
      prev.size === rooms.length ? new Set<number>() : new Set(rooms.map((r) => r.id)),
    );

  /** 房间改赛季：后端会把该房间下的赛程一起迁移 */
  const changeSeason = async (room: MatchRoom, season: string) => {
    if (!season || season === (room.season ?? "").toLowerCase()) return;
    setSeasonBusy(room.id);
    const res = await api.patch(`/api/rooms/${room.id}`, { season });
    setSeasonBusy(null);
    if (res.ok) {
      toast({ title: "房间赛季已更新（赛程已同步）" });
      void load();
    } else {
      toast({ variant: "destructive", title: "赛季更新失败" });
    }
  };

  const confirmBatchDelete = async () => {
    if (deleteIds.size === 0) return;
    const ids = Array.from(deleteIds);
    setBatchDelBusy(true);
    setBatchDelProgress(0);
    let ok = 0;
    let done = 0;
    await mapLimit(ids, 4, async (id) => {
      const res = await api.delete(`/api/rooms/${id}`);
      if (res.ok) ok += 1;
      done += 1;
      setBatchDelProgress(done);
    });
    setBatchDelBusy(false);
    const failed = ids.length - ok;
    toast({
      title: `批量删除完成：成功 ${ok} / ${ids.length}`,
      description: failed > 0 ? `${failed} 个删除失败，可刷新后重试` : undefined,
    });
    setBatchDeleteOpen(false);
    setDeleteIds(new Set());
    void load();
  };

  // 本阶段已有房间的最大场次 +1，避免跨天批量新建时场次重复（只统计目标赛季）
  const batchStart = useMemo(() => {
    if (!batchStage) return 1;
    const target = (batchSeason || currentSeason).toLowerCase();
    const max = (data ?? [])
      .filter((r) => (r.season ?? "").toLowerCase() === target)
      .reduce(
        (m, r) => (r.roundNumber === Number(batchStage) ? Math.max(m, r.matchNumber) : m),
        0,
      );
    return max + 1;
  }, [batchStage, batchSeason, currentSeason, data]);

  const resetBatch = () => {
    setBatchDateObj(undefined);
    setBatchStage("");
    setBatchMax("");
    setBatchProgress(0);
    setBatchTotal(0);
  };

  const batchCreate = async () => {
    if (!batchDateObj) {
      toast({ title: "请选择日期" });
      return;
    }
    if (!batchStage) {
      toast({ title: "请选择阶段" });
      return;
    }
    const dateStr = format(batchDateObj, "yyyy-MM-dd");
    const targetSeason = (batchSeason || currentSeason).toLowerCase();
    // 同一赛季、同一天已经存在的时段直接跳过，避免重复批量生成同一批房间
    const taken = new Set(
      (data ?? [])
        .filter((r) => (r.season ?? "").toLowerCase() === targetSeason)
        .map((r) => (r.matchTime ?? "").slice(0, 16)),
    );
    const slots = ALL_TIMES.map((t) => ({ time: t, key: `${dateStr}T${t}` })).filter(
      (s) => !taken.has(s.key),
    );
    const skipped = ALL_TIMES.length - slots.length;
    if (slots.length === 0) {
      toast({
        title: "所选日期的时段都已有房间",
        description: "换一天，或先删除该日期已有房间后再批量新建。",
      });
      return;
    }
    setBatchBusy(true);
    setBatchProgress(0);
    setBatchTotal(slots.length);
    let ok = 0;
    let done = 0;
    await mapLimit(slots, 4, async (slot, i) => {
      const res = await api.post("/api/rooms", {
        room_name: `${STAGE_LABEL[batchStage] ?? batchStage} ${batchStart + i}`,
        round_number: Number(batchStage),
        match_date: `${dateStr}T00:00:00`,
        match_time: `${slot.key}:00`,
        match_number: batchStart + i,
        max_participants: batchMax ? Number(batchMax) : 2,
        description: null,
        season: batchSeason || currentSeason || undefined,
      });
      if (res.ok) ok += 1;
      done += 1;
      setBatchProgress(done);
    });
    setBatchBusy(false);
    const failed = slots.length - ok;
    toast({
      title: `批量新建完成：成功 ${ok} / ${slots.length}${
        skipped > 0 ? `，跳过 ${skipped} 个已存在时段` : ""
      }`,
      description: failed > 0 ? `${failed} 个创建失败，请重试` : undefined,
    });
    setBatchOpen(false);
    resetBatch();
    void load();
  };

  if (loading) return <LoadingBlock label="加载房间中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle tag="房间管理" accent="var(--pc-teal)" className="mb-0">
          比赛房间
        </SectionTitle>
        <div className="flex items-center gap-2">
        <SeasonSelect
          value={activeSeason}
          onChange={(v) => setSeasonFilter(v)}
          options={seasonOptions}
          includeAll
          className="w-36"
        />
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setDateObj(undefined);
              setDateOpen(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="primary">新建房间</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建房间</DialogTitle>
              <DialogDescription>填写房间信息后点击创建。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>房间名称</Label>
                <Input
                  value={form.room_name}
                  onChange={setField("room_name")}
                  placeholder="e.g. RO16 · Room 1"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>赛季</Label>
                <SeasonSelect
                  value={newRoomSeason || currentSeason}
                  onChange={setNewRoomSeason}
                  options={seasonOptions}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>阶段</Label>
                  <Select
                    value={form.round_number}
                    onValueChange={(v) => setForm((f) => ({ ...f, round_number: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择阶段" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUND_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>场次</Label>
                  <Input value={form.match_number} onChange={setField("match_number")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>日期</Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        role="combobox"
                        aria-expanded={dateOpen}
                        className="flex h-10 w-full items-center justify-between rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-3 text-sm text-(--pc-ink) outline-none transition focus:border-pc-primary focus:shadow-[0_0_0_3px_rgba(232,93,117,0.15)]"
                        onClick={() => {
                          if (!dateObj && form.match_date) setDateObj(new Date(form.match_date));
                        }}
                      >
                        {dateObj ? format(dateObj, "yyyy年M月d日") : form.match_date || "选择日期"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-(--pc-faint)" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateObj}
                        captionLayout="dropdown"
                        fromYear={2020}
                        toYear={2030}
                        defaultMonth={dateObj}
                        onSelect={(d) => {
                          setDateObj(d);
                          setForm((f) => ({ ...f, match_date: d ? format(d, "yyyy-MM-dd") : "" }));
                          setDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-1.5">
                  <Label>时间</Label>
                  <Select
                    value={form.match_time}
                    onValueChange={(v) => setForm((f) => ({ ...f, match_time: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择时间" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>早上</SelectLabel>
                        {MORNING_TIMES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>下午</SelectLabel>
                        {AFTERNOON_TIMES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>最大人数</Label>
                <Input
                  type="number"
                  value={form.max_participants}
                  onChange={setField("max_participants")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>描述</Label>
                <Input value={form.description} onChange={setField("description")} placeholder="可选" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button variant="primary" onClick={createRoom} disabled={busy}>
                {busy ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={batchOpen}
          onOpenChange={(o) => {
            setBatchOpen(o);
            if (!o) resetBatch();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="teal">批量新建房间</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>批量新建房间</DialogTitle>
              <DialogDescription>按预设时间段为所选日期、阶段批量创建房间，场次自动递增。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>日期</Label>
                <Popover open={batchDateOpen} onOpenChange={setBatchDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={batchDateOpen}
                      className="flex h-10 w-full items-center justify-between rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-3 text-sm text-(--pc-ink) outline-none transition focus:border-pc-primary focus:shadow-[0_0_0_3px_rgba(232,93,117,0.15)]"
                    >
                      {batchDateObj ? format(batchDateObj, "yyyy年M月d日") : "选择日期"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-(--pc-faint)" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={batchDateObj}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                      defaultMonth={batchDateObj}
                      onSelect={(d) => {
                        setBatchDateObj(d);
                        setBatchDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>赛季</Label>
                  <SeasonSelect
                    value={batchSeason || currentSeason}
                    onChange={setBatchSeason}
                    options={seasonOptions}
                    className="w-full"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>阶段</Label>
                  <Select value={batchStage} onValueChange={setBatchStage}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择阶段" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUND_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>最大人数</Label>
                <Input
                  type="number"
                  value={batchMax}
                  onChange={(e) => setBatchMax(e.target.value)}
                />
              </div>
              <div className="rounded-xl border-2 border-(--pc-border) bg-(--pc-paper) p-3 text-xs text-(--pc-slate)">
                将创建 {ALL_TIMES.length} 个房间（{ALL_TIMES[0]} ~ {ALL_TIMES[ALL_TIMES.length - 1]}），房间名「
                {STAGE_LABEL[batchStage] ?? "Stage"} 1」至「{STAGE_LABEL[batchStage] ?? "Stage"} {ALL_TIMES.length}」。
                同一天已有房间的时段会自动跳过。
              </div>
              {batchBusy && (
                <div className="h-2 overflow-hidden rounded-full bg-(--pc-paper)">
                  <div
                    className="h-full rounded-full bg-pc-teal transition-all duration-200"
                    style={{ width: `${batchTotal ? (batchProgress / batchTotal) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={batchBusy}>取消</Button>
              </DialogClose>
              <Button variant="primary" onClick={() => void batchCreate()} disabled={batchBusy}>
                {batchBusy
                  ? `创建中 ${batchProgress}/${batchTotal || ALL_TIMES.length}`
                  : `一键新建 ${ALL_TIMES.length} 个房间`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={batchDeleteOpen}
          onOpenChange={(o) => {
            setBatchDeleteOpen(o);
            if (!o) setDeleteIds(new Set());
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="border-pc-primary/60 text-pc-primary hover:bg-pc-primary/5">
              批量删除
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>批量删除房间</DialogTitle>
              <DialogDescription>
                勾选要删除的房间，确认后逐个删除（不可撤销）。房间下的赛程、比分、对战与人员安排会一并删除。
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs text-(--pc-faint)">已选 {deleteIds.size} / {rooms.length} 个房间</span>
              <Button variant="outline" size="sm" onClick={toggleDeleteAll}>
                {deleteIds.size === rooms.length ? "取消全选" : "全选"}
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border-2 border-(--pc-border)">
              {rooms.map((room) => {
                const stageLabel =
                  ROUND_OPTIONS.find((o) => o.value === String(room.roundNumber))?.label ??
                  `R${room.roundNumber}`;
                return (
                  <label
                    key={room.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-(--pc-border)/60 px-3 py-2.5 last:border-0 hover:bg-(--pc-paper)"
                  >
                    <input
                      type="checkbox"
                      checked={deleteIds.has(room.id)}
                      onChange={() => toggleDeleteId(room.id)}
                      className="h-4 w-4 accent-pc-primary"
                    />
                    <span className="font-bold text-(--pc-ink)">{room.roomName}</span>
                    <span className="text-xs text-(--pc-faint)">
                      {stageLabel} · {formatMatchTime(room.matchTime)}
                    </span>
                  </label>
                );
              })}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={batchDelBusy}>取消</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => void confirmBatchDelete()}
                disabled={batchDelBusy || deleteIds.size === 0}
              >
                {batchDelBusy
                  ? `删除中 ${batchDelProgress}/${deleteIds.size}`
                  : `删除 ${deleteIds.size} 个房间`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {rooms.length === 0 ? (
        <p className="py-10 text-center text-sm text-(--pc-faint)">
          {activeSeason === "all" ? "还没有房间。" : "当前赛季还没有房间。"}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-(--pc-border) bg-(--pc-paper)">
                <th className="px-4 py-3 font-bold text-(--pc-slate)">房间名称</th>
                <th className="px-4 py-3 font-bold text-(--pc-slate)">赛季</th>
                <th className="px-4 py-3 font-bold text-(--pc-slate)">阶段</th>
                <th className="px-4 py-3 font-bold text-(--pc-slate)">编号</th>
                <th className="px-4 py-3 font-bold text-(--pc-slate)">比赛时间</th>
                <th className="px-4 py-3 font-bold text-(--pc-slate)">人数</th>
                <th className="px-4 py-3 font-bold text-(--pc-slate)">状态</th>
                <th className="px-4 py-3 font-bold text-(--pc-slate)">预约</th>
                <th className="px-4 py-3 font-bold text-(--pc-slate)">操作</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const scheduleCount = room.schedules?.length ?? room.scheduleIds?.length ?? 0;
                const stageLabel =
                  ROUND_OPTIONS.find((o) => o.value === String(room.roundNumber))?.label ??
                  `R${room.roundNumber}`;
                return (
                  <tr key={room.id} className="border-b border-(--pc-border)/60 hover:bg-(--pc-paper)">
                    <td className="px-4 py-3">
                      <p className="font-bold text-(--pc-ink)">{room.roomName}</p>
                      {room.description && (
                        <p className="mt-0.5 text-xs text-(--pc-faint)">{room.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeasonSelect
                        value={(room.season ?? "").toLowerCase()}
                        onChange={(v) => void changeSeason(room, v)}
                        options={seasonOptions}
                        className="h-8 w-24"
                        disabled={seasonBusy === room.id}
                      />
                    </td>
                    <td className="px-4 py-3 font-sans text-(--pc-slate)">{stageLabel}</td>
                    <td className="px-4 py-3 font-sans text-(--pc-slate)">{room.matchNumber}</td>
                    <td className="px-4 py-3 font-sans text-(--pc-slate)">
                      {formatMatchTime(room.matchTime)}
                    </td>
                    <td className="px-4 py-3 font-sans text-(--pc-slate)">{room.maxParticipants}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(room.status)}>{room.status}</Badge>
                    </td>
                    <td className="px-4 py-3 font-sans text-(--pc-slate)">
                      {scheduleCount > 0 ? scheduleCount : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Dialog
                        open={deleteTarget?.id === room.id}
                        onOpenChange={(o) => !o && setDeleteTarget(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(room)}
                          >
                            删除
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>删除房间</DialogTitle>
                            <DialogDescription>
                              确定要删除「{room.roomName}」吗？此操作不可撤销。
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">取消</Button>
                            </DialogClose>
                            <Button variant="destructive" onClick={confirmDelete} disabled={delBusy}>
                              {delBusy ? "删除中…" : "确认删除"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
