import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import type { Settings } from "@/lib/types";

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

const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "qua", label: "资格赛" },
  { value: "ro16", label: "16强" },
  { value: "qf", label: "四分之一决赛" },
  { value: "sf", label: "半决赛" },
  { value: "f", label: "决赛" },
  { value: "gf", label: "总决赛" },
];

function StageCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = STAGE_OPTIONS.find((o) => o.value === value);
  const filtered = STAGE_OPTIONS.filter(
    (o) => o.label.includes(query) || o.value.includes(query),
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-3 text-sm text-(--pc-ink) outline-none transition focus:border-[#e85d75]"
        >
          {current ? `${current.label} (${current.value})` : value || "选择阶段"}
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

function str(v: unknown): string {
  return v == null ? "" : String(v);
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      tournament_name: str(data.tournament_name),
      current_season_stage: str(data.current_season_stage),
      min_pp_for_registration: str(data.min_pp_for_registration),
      max_pp_for_registration: str(data.max_pp_for_registration),
    });
    setCurrentSeason(str(data.current_season));
    const dict = data.seasons ?? {};
    setSeasons(
      Object.entries(dict).map(([id, s]) => ({
        id,
        name: s?.name || id,
        status: s?.status || "active",
      })),
    );
    setRegistrationEnabled(String(data.registration_enabled ?? true) !== "false");
    setMappoolVisible(String(data.mappool_visible ?? true) !== "false");
  }, [data]);

  const setField =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
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
    const id = seasons[index].id;
    setSeasons((list) => list.filter((_, i) => i !== index));
    if (currentSeason === id) setCurrentSeason(seasons.find((s) => s.id !== id)?.id ?? "");
  };

  const save = async () => {
    setBusy(true);
    const seasonsDict: Record<string, { name: string; status: string }> = {};
    for (const s of seasons) {
      if (s.id.trim()) seasonsDict[s.id.trim()] = { name: s.name.trim() || s.id.trim(), status: s.status };
    }
    const body = {
      tournament_name: form.tournament_name,
      current_season: currentSeason,
      current_season_stage: form.current_season_stage,
      min_pp_for_registration: form.min_pp_for_registration,
      max_pp_for_registration: form.max_pp_for_registration,
      registration_enabled: String(registrationEnabled),
      mappool_visible: String(mappoolVisible),
      seasons: seasonsDict,
    };
    const res = await api.post<Settings>("/api/settings", body, { method: "PUT" });
    setBusy(false);
    if (res.ok) {
      toast({ title: "设置已保存" });
      void load();
    } else {
      toast({ variant: "destructive", title: "保存失败" });
    }
  };

  if (loading) return <LoadingBlock label="加载设置中…" />;
  if (error || !data)
    return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  return (
    <div>
      <SectionTitle tag="系统设置" accent="#e85d75">
        赛事设置
      </SectionTitle>

      <Card>
        <CardContent className="p-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>赛事名称</Label>
              <Input value={form.tournament_name} onChange={setField("tournament_name")} />
            </div>
            <div className="grid gap-1.5">
              <Label>当前阶段</Label>
              <StageCombobox
                value={form.current_season_stage}
                onChange={(v) => setForm((f) => ({ ...f, current_season_stage: v }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>报名最低 PP</Label>
              <Input value={form.min_pp_for_registration} onChange={setField("min_pp_for_registration")} />
            </div>
            <div className="grid gap-1.5">
              <Label>报名最高 PP</Label>
              <Input value={form.max_pp_for_registration} onChange={setField("max_pp_for_registration")} />
            </div>
          </div>

          <Separator className="my-6" />

          {/* 当前赛季 */}
          <div className="grid gap-1.5">
            <Label>当前赛季（赛季 ID）</Label>
            <Select value={currentSeason} onValueChange={setCurrentSeason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择赛季" />
              </SelectTrigger>
              <SelectContent>
                {seasons.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    暂无赛季，请先在下方赛季池添加
                  </SelectItem>
                )}
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}（{s.id}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-6" />

          {/* 赛季池 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-(--pc-ink)">赛季池</p>
              <p className="text-xs text-(--pc-faint)">赛季 ID · 赛季名 · 赛季状态</p>
            </div>
            <div className="flex items-end gap-2">
              <Input
                value={newSeasonId}
                onChange={(e) => setNewSeasonId(e.target.value)}
                placeholder="赛季 ID，如 s2"
                className="w-32"
              />
              <Input
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="赛季名，如 第二赛季"
                className="w-40"
              />
              <Button variant="teal" size="sm" onClick={addSeason}>
                <Plus className="h-4 w-4" />
                添加赛季
              </Button>
            </div>
          </div>

          {seasons.length === 0 ? (
            <p className="mt-4 rounded-xl bg-(--pc-paper) p-4 text-sm text-(--pc-faint)">
              还没有任何赛季。
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {seasons.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3"
                >
                  <Badge variant="outline">{s.id}</Badge>
                  <Input
                    value={s.name}
                    onChange={(e) => updateSeason(i, { name: e.target.value })}
                    className="w-48"
                    placeholder="赛季名"
                  />
                  <Select
                    value={s.status}
                    onValueChange={(v) => updateSeason(i, { status: v })}
                  >
                    <SelectTrigger className="w-32">
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
                  {currentSeason === s.id && (
                    <Badge variant="primary">当前赛季</Badge>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentSeason(s.id)}
                      disabled={currentSeason === s.id}
                    >
                      设为当前
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSeason(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator className="my-6" />

          {/* 开关 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-4">
              <div>
                <p className="font-bold text-(--pc-ink)">开放报名</p>
                <p className="text-xs text-(--pc-faint)">允许新玩家报名</p>
              </div>
              <input
                type="checkbox"
                checked={registrationEnabled}
                onChange={(e) => setRegistrationEnabled(e.target.checked)}
                className="h-5 w-5 accent-[#e85d75]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-4">
              <div>
                <p className="font-bold text-(--pc-ink)">图池可见</p>
                <p className="text-xs text-(--pc-faint)">向玩家展示图池</p>
              </div>
              <input
                type="checkbox"
                checked={mappoolVisible}
                onChange={(e) => setMappoolVisible(e.target.checked)}
                className="h-5 w-5 accent-[#6b7fb5]"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={save} disabled={busy}>
              {busy ? "保存中…" : "保存设置"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
