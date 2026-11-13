import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  Check,
  ChevronsUpDown,
  Eye,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Trophy,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { LoadingBlock, ErrorBlock } from "@/components/paper/feedback";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BusyButton } from "@/components/ui/busy-button";
import UserAvatar from "@/components/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { REG_STATUS_LABEL, REG_STATUS_VARIANT } from "@/lib/types";
import type { Settings, AdminUserStub } from "@/lib/types";

interface FormState {
  tournament_name: string;
  current_season_stage: string;
  min_pp_for_registration: string;
  max_pp_for_registration: string;
}

interface SeasonRow {
  id: string;
  name: string;
  status: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "进行中" },
  { value: "upcoming", label: "未开始" },
  { value: "finished", label: "已结束" },
];

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  active: "teal",
  upcoming: "yellow",
  finished: "outline",
};

const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "qua", label: "QUA" },
  { value: "ro16", label: "RO16" },
  { value: "qf", label: "QF" },
  { value: "sf", label: "SF" },
  { value: "f", label: "F" },
  { value: "gf", label: "GF" },
];

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function seasonsFromSettings(data: Settings): SeasonRow[] {
  return Object.entries(data.seasons ?? {}).map(([id, s]) => ({
    id,
    name: s?.name || id,
    status: s?.status || "active",
  }));
}

/** 带图标的设置分区卡片 */
function Panel({
  icon: Icon,
  title,
  desc,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-(--pc-border) bg-(--pc-white) p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-(--pc-paper) text-pc-primary">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-(--pc-ink)">{title}</h3>
            {desc && <p className="mt-0.5 text-[11px] text-(--pc-faint)">{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-(--pc-slate)">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-(--pc-faint)">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onCheckedChange,
}: {
  title: string;
  desc?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-(--pc-border) bg-(--pc-paper)/60 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-(--pc-ink)">{title}</p>
        {desc && <p className="mt-0.5 text-[11px] text-(--pc-faint)">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StageCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = STAGE_OPTIONS.find((o) => o.value === value);
  const filtered = STAGE_OPTIONS.filter((o) => o.label.includes(query) || o.value.includes(query));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-3 text-sm text-(--pc-ink) outline-none transition focus:border-pc-primary"
        >
          {current ? current.label : value || "选择阶段"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-(--pc-faint)" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索阶段…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>未找到阶段</CommandEmpty>
            <CommandGroup>
              {filtered.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={(v) => {
                    onChange(v);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")}
                  />
                  {o.label}
                  <span className="ml-auto text-xs text-(--pc-faint)">{o.value}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function SettingsManagement() {
  const { data, loading, error, load } = useFetch<Settings>(() => api.get("/api/settings"));
  const [form, setForm] = useState<FormState>({
    tournament_name: "",
    current_season_stage: "",
    min_pp_for_registration: "",
    max_pp_for_registration: "",
  });
  const [currentSeason, setCurrentSeason] = useState("");
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [newSeasonId, setNewSeasonId] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [mappoolVisible, setMappoolVisible] = useState(true);
  const [useGv0, setUseGv0] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seasonPlayers, setSeasonPlayers] = useState<AdminUserStub[] | null>(null);
  const [seasonPlayersFor, setSeasonPlayersFor] = useState<string | null>(null);
  const [seasonPlayersBusy, setSeasonPlayersBusy] = useState(false);

  const applyData = useCallback((d: Settings) => {
    setForm({
      tournament_name: str(d.tournament_name),
      current_season_stage: str(d.current_season_stage),
      min_pp_for_registration: str(d.min_pp_for_registration),
      max_pp_for_registration: str(d.max_pp_for_registration),
    });
    setCurrentSeason(str(d.current_season));
    setSeasons(seasonsFromSettings(d));
    setRegistrationEnabled(String(d.registration_enabled ?? true) !== "false");
    setMappoolVisible(String(d.mappool_visible ?? true) !== "false");
    setUseGv0(String(d.use_gv0 ?? false) === "true");
  }, []);

  useEffect(() => {
    if (data) applyData(data);
  }, [data, applyData]);

  // 与服务器快照对比，提示未保存修改
  const initialSeasons = useMemo(() => (data ? seasonsFromSettings(data) : []), [data]);
  const dirty =
    !!data &&
    (form.tournament_name !== str(data.tournament_name) ||
      form.current_season_stage !== str(data.current_season_stage) ||
      form.min_pp_for_registration !== str(data.min_pp_for_registration) ||
      form.max_pp_for_registration !== str(data.max_pp_for_registration) ||
      currentSeason !== str(data.current_season) ||
      JSON.stringify(seasons) !== JSON.stringify(initialSeasons) ||
      registrationEnabled !== (String(data.registration_enabled ?? true) !== "false") ||
      mappoolVisible !== (String(data.mappool_visible ?? true) !== "false") ||
      useGv0 !== (String(data.use_gv0 ?? false) === "true"));

  const setField = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const updateSeason = (index: number, patch: Partial<SeasonRow>) =>
    setSeasons((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const addSeason = () => {
    const id = newSeasonId.trim();
    if (!id) {
      toast({ title: "请填写赛季 ID" });
      return;
    }
    if (seasons.some((s) => s.id === id)) {
      toast({ variant: "destructive", title: "赛季 ID 已存在" });
      return;
    }
    setSeasons([...seasons, { id, name: newSeasonName.trim() || id, status: "upcoming" }]);
    setNewSeasonId("");
    setNewSeasonName("");
    if (!currentSeason) setCurrentSeason(id);
  };

  const removeSeason = (index: number) => {
    const removed = seasons[index];
    if (!removed) return;
    const remaining = seasons.filter((_, i) => i !== index);
    // 删除当前赛季时，选相邻（同下标）的赛季作为替代，否则取最后一个
    if (currentSeason === removed.id) {
      setCurrentSeason(remaining[Math.min(index, remaining.length - 1)]?.id ?? "");
    }
    setSeasons(remaining);
  };

  // 已结束赛季：拉取参加过该赛季但未审核的玩家
  const loadSeasonPlayers = async (seasonId: string) => {
    setSeasonPlayersBusy(true);
    setSeasonPlayersFor(seasonId);
    const res = await api.get<AdminUserStub[]>("/api/admin/users");
    setSeasonPlayersBusy(false);
    if (res.ok) {
      const list = (res.data ?? []).filter(
        (u) =>
          u.season?.includes(seasonId) && (u.registrationStatus ?? "not_registered") !== "approved",
      );
      setSeasonPlayers(list);
    } else {
      setSeasonPlayers(null);
      toast({ variant: "destructive", title: "获取用户失败" });
    }
  };

  const save = async () => {
    const min = form.min_pp_for_registration.trim();
    const max = form.max_pp_for_registration.trim();
    if (min && max && Number(min) > Number(max)) {
      toast({
        variant: "destructive",
        title: "PP 门槛不合法",
        description: "最低 PP 不能大于最高 PP",
      });
      return;
    }
    setBusy(true);
    const seasonsDict: Record<string, { name: string; status: string }> = {};
    for (const s of seasons) {
      if (s.id.trim()) {
        seasonsDict[s.id.trim()] = {
          name: s.name.trim() || s.id.trim(),
          status: s.status,
        };
      }
    }
    const body = {
      tournament_name: form.tournament_name,
      current_season: currentSeason,
      current_season_stage: form.current_season_stage,
      min_pp_for_registration: form.min_pp_for_registration,
      max_pp_for_registration: form.max_pp_for_registration,
      registration_enabled: String(registrationEnabled),
      mappool_visible: String(mappoolVisible),
      use_gv0: String(useGv0),
      seasons: seasonsDict,
    };
    const res = await api.put<Settings>("/api/settings", body);
    setBusy(false);
    if (res.ok) {
      toast({ title: "设置已保存" });
      void load();
    } else {
      toast({ variant: "destructive", title: "保存失败" });
    }
  };

  if (loading) return <LoadingBlock label="加载设置中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  const currentRow = seasons.find((s) => s.id === currentSeason);

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle>赛事设置</SectionTitle>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {currentRow && <Badge variant="outline">{currentRow.name}</Badge>}
          {form.current_season_stage && (
            <Badge variant="teal">{form.current_season_stage.toUpperCase()}</Badge>
          )}
          {dirty && <Badge variant="yellow">有未保存修改</Badge>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* 左列 */}
        <div className="flex flex-col gap-4">
          <Panel icon={Trophy} title="赛事信息">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="赛事名称">
                  <Input
                    value={form.tournament_name}
                    onChange={setField("tournament_name")}
                    placeholder="例如 Astra Cup"
                  />
                </Field>
              </div>
              <Field label="当前赛季">
                <Select value={currentSeason} onValueChange={setCurrentSeason}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择赛季" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        暂无赛季，请先在右侧赛季池添加
                      </SelectItem>
                    )}
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}（{s.id}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="当前阶段">
                <StageCombobox
                  value={form.current_season_stage}
                  onChange={(v) => setForm((f) => ({ ...f, current_season_stage: v }))}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            icon={CalendarRange}
            title="赛季池"
            action={<Badge variant="outline">{seasons.length} 个赛季</Badge>}
          >
            {seasons.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-(--pc-border) bg-(--pc-paper)/60 p-5 text-center text-sm text-(--pc-faint)">
                还没有任何赛季，先在下面添加一个吧
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {seasons.map((s, i) => {
                  const isCurrent = s.id === currentSeason;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "rounded-xl border-2 p-3 transition-colors",
                        isCurrent
                          ? "border-pc-primary bg-pc-primary/[0.06]"
                          : "border-(--pc-border) bg-(--pc-white)",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-(--pc-ink) px-2 py-0.5 font-mono text-[11px] font-bold text-pc-cream">
                          {s.id}
                        </span>
                        <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>
                          {STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status}
                        </Badge>
                        {isCurrent && <Badge variant="primary">当前赛季</Badge>}
                        <div className="ml-auto flex items-center gap-1.5">
                          {s.status === "finished" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void loadSeasonPlayers(s.id)}
                            >
                              <UsersRound className="h-3.5 w-3.5" />
                              未审核
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentSeason(s.id)}
                            disabled={isCurrent}
                          >
                            设为当前
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => removeSeason(i)}
                            aria-label={`删除赛季 ${s.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                        <Input
                          value={s.name}
                          onChange={(e) => updateSeason(i, { name: e.target.value })}
                          placeholder="赛季名"
                          className="h-9"
                        />
                        <Select
                          value={s.status}
                          onValueChange={(v) => updateSeason(i, { status: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 grid gap-2 rounded-xl border-2 border-dashed border-(--pc-border) p-3 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
              <Input
                value={newSeasonId}
                onChange={(e) => setNewSeasonId(e.target.value)}
                placeholder="ID，如 s3"
                className="h-9"
              />
              <Input
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="赛季名，如 第三赛季"
                className="h-9"
              />
              <Button variant="teal" size="sm" onClick={addSeason}>
                <Plus className="h-3.5 w-3.5" /> 添加
              </Button>
            </div>
          </Panel>
        </div>

        {/* 右列 */}
        <div className="flex flex-col gap-4">
          <Panel icon={UserPlus} title="报名设置">
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="最低 PP" hint="留空不限">
                  <Input
                    value={form.min_pp_for_registration}
                    onChange={setField("min_pp_for_registration")}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </Field>
                <Field label="最高 PP" hint="留空不限">
                  <Input
                    value={form.max_pp_for_registration}
                    onChange={setField("max_pp_for_registration")}
                    inputMode="numeric"
                    placeholder="99999"
                  />
                </Field>
              </div>
              <ToggleRow
                title="开放报名"
                checked={registrationEnabled}
                onCheckedChange={setRegistrationEnabled}
              />
            </div>
          </Panel>

          <Panel icon={Eye} title="展示与联动">
            <div className="grid gap-2">
              <ToggleRow
                title="图池可见"
                checked={mappoolVisible}
                onCheckedChange={setMappoolVisible}
              />
              <ToggleRow
                title="使用 g0v0 比赛"
                desc={useGv0 ? "开启后报名需先绑定 g0v0 账号" : "关闭时无 g0v0 绑定也可报名"}
                checked={useGv0}
                onCheckedChange={setUseGv0}
              />
            </div>
          </Panel>
        </div>
      </div>

      {/* 底部保存栏 */}
      <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-(--pc-border) bg-(--pc-white)/95 px-4 py-3 shadow-[4px_4px_0px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-(--pc-faint)">
          <span
            className={cn("h-2 w-2 rounded-full", dirty ? "bg-pc-yellow" : "bg-pc-teal")}
            aria-hidden
          />
          {busy ? "保存中…" : dirty ? "有未保存的修改" : "所有修改已保存"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyData(data)}
            disabled={!dirty || busy}
          >
            <RotateCcw className="h-3.5 w-3.5" /> 重置
          </Button>
          <BusyButton
            size="sm"
            onClick={() => void save()}
            disabled={!dirty}
            loading={busy}
            icon={<Save className="h-3.5 w-3.5" />}
          >
            保存设置
          </BusyButton>
        </div>
      </div>

      <Dialog
        open={seasonPlayersFor !== null}
        onOpenChange={(o) => !o && setSeasonPlayersFor(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>该赛季未审核玩家</DialogTitle>
            <DialogDescription>
              参加过赛季「{seasonPlayersFor ?? ""}」但报名状态不是“已通过”的玩家（共{" "}
              {seasonPlayers?.length ?? 0} 人）
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto rounded-xl border-2 border-(--pc-border)">
            {seasonPlayersBusy ? (
              <p className="p-6 text-center text-sm text-(--pc-faint)">加载中…</p>
            ) : !seasonPlayers || seasonPlayers.length === 0 ? (
              <p className="p-6 text-center text-sm text-(--pc-faint)">没有符合条件的玩家</p>
            ) : (
              <ul className="divide-y divide-(--pc-border)">
                {seasonPlayers.map((u) => (
                  <li key={u.osuId} className="flex items-center gap-3 px-4 py-2.5">
                    <UserAvatar
                      username={u.username}
                      avatarUrl={u.avatarUrl}
                      osuId={u.osuId}
                      className="h-8 w-8"
                    />
                    <span className="font-bold text-(--pc-ink)">{u.username}</span>
                    <span className="font-mono text-xs text-(--pc-slate)">{u.osuId}</span>
                    <Badge
                      className="ml-auto"
                      variant={
                        REG_STATUS_VARIANT[u.registrationStatus ?? "not_registered"] ?? "outline"
                      }
                    >
                      {REG_STATUS_LABEL[u.registrationStatus ?? "not_registered"]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">关闭</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
