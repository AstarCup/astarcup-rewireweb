import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import RadarChart from "@/components/ui/RadarChart";
import { PageHeader } from "@/components/paper/paper";
import { LoadingBlock, ErrorBlock, useAsync } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn, fmtInt } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { seasonOptions as buildSeasonOptions } from "@/lib/types";
import { seasonLabel } from "@/lib/types";
import type { SessionUser, Settings } from "@/lib/types";

type FilterKey = "all" | "approved" | "registered";

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "approved", label: "已审核" },
  { key: "registered", label: "待审核" },
];

function statusBadge(status?: string) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="teal" className="border-[#5cb8a5] bg-[#5cb8a5] text-[#fdf6ee]">
          已审核
        </Badge>
      );
    case "registered":
      return (
        <Badge variant="yellow" className="border-[#f5c040] bg-[#f5c040] text-[#2d2d2d]">
          待审核
        </Badge>
      );
    default:
      return <Badge variant="outline">{status ?? "未知"}</Badge>;
  }
}

function coverUrl(p: SessionUser): string | null {
  return p.cover?.customUrl || p.cover?.url || null;
}

function radarSkills(p: SessionUser) {
  const skills = [
    { label: "准度", value: Number(p.accuracy) || 0 },
    { label: "体力", value: Number(p.stamina) || 0 },
    { label: "初见力", value: Number(p.firstSight) || 0 },
    { label: "策略", value: Number(p.strategy) || 0 },
    { label: "经验", value: Number(p.experience) || 0 },
  ];
  if (p.customKey && p.customValue != null) {
    skills.push({ label: p.customKey, value: Number(p.customValue) || 0 });
  }
  return skills;
}

async function copyOsuId(osuId: string) {
  try {
    await navigator.clipboard.writeText(osuId);
    toast({ title: "已复制 osuID", description: osuId });
  } catch {
    toast({ variant: "destructive", title: "复制失败" });
  }
}

function PlayerCard({
  player,
  settings,
  onSelect,
}: {
  player: SessionUser;
  settings: Settings | null;
  onSelect: (p: SessionUser) => void;
}) {
  const cover = coverUrl(player);
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={() => onSelect(player)}
          className="flex flex-col overflow-hidden rounded-2xl bg-white text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]"
        >
          <div
            className={cn(
              "relative h-20 w-full overflow-hidden",
              cover && "bg-gradient-to-br from-[#5cb8a5]/40 to-[#6b7fb5]/40",
            )}
          >
            {cover && (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            )}
            <span className="absolute right-2 top-2">{statusBadge(player.registrationStatus)}</span>
          </div>
          <div className="-mt-9 flex flex-col items-center gap-2 px-4 pb-4">
            <Avatar className="h-16 w-16 rounded-2xl border-4 border-white bg-[#fdf6ee]">
              <AvatarImage src={player.avatarUrl ?? undefined} alt={player.username} />
              <AvatarFallback className="bg-[#f5c040]/30 text-lg font-bold text-[#2d2d2d]">
                {player.username?.slice(0, 1).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-bold text-[#2d2d2d]">{player.username}</p>
              <p className="mt-0.5 text-xs text-[#b0a898]">{player.country ?? "-"}</p>
            </div>
            <div className="flex w-full items-center justify-around">
              <div className="flex-1">
                <p className="text-xs text-[#b0a898]">PP</p>
                <p className="font-sans text-lg font-bold text-[#6b7fb5]">{fmtInt(player.pp)}</p>
              </div>
              <div className="w-px self-stretch bg-[#e0d8cc]" />
              <div className="flex-1">
                <p className="text-xs text-[#b0a898]">世界排名</p>
                <p className="font-sans text-lg font-bold text-[#2d2d2d]">
                  {player.globalRank != null ? `#${fmtInt(player.globalRank)}` : "-"}
                </p>
              </div>
            </div>
          </div>
        </button>
      </HoverCardTrigger>
      {player.season && player.season.length > 0 && (
        <HoverCardContent side="top" align="center" className="max-w-[240px]">
          <p className="text-xs font-bold text-[#b0a898]">已报名参赛过的赛季</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {player.season.map((s) => (
              <Badge key={s} variant="yellow">
                <Trophy className="h-3.5 w-3.5" />
                {seasonLabel(settings, s) || s}
              </Badge>
            ))}
          </div>
        </HoverCardContent>
      )}
    </HoverCard>
  );
}

export default function RegistrationsPage() {
  const { settings } = useApp();
  const seasonOptions = buildSeasonOptions(settings);
  const { data, loading, error, run } = useAsync<SessionUser[]>();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [season, setSeason] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<SessionUser | null>(null);

  const currentSeason = settings?.current_season;

  // 默认取当前赛季；仅当用户尚未选择时填充，选择「全部」("") 后不再覆盖
  useEffect(() => {
    if (!settings) return;
    setSeason((s) => (s === undefined ? currentSeason ?? "" : s));
  }, [settings, currentSeason]);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (season === undefined) return;
    if (loadedRef.current) return;
    loadedRef.current = true;
    void run(() => api.get<SessionUser[]>("/api/users"));
  }, [season, run]);

  const players = data ?? [];
  const loadingPlayers = season === undefined || loading;

  const bySeason = useMemo(() => {
    if (!season) return players;
    return players.filter((p) => p.season?.includes(season));
  }, [players, season]);

  const visible = useMemo(() => {
    if (filter === "all") return bySeason;
    return bySeason.filter((p) => p.registrationStatus === filter);
  }, [bySeason, filter]);

  const counts = useMemo(() => {
    let approved = 0;
    let registered = 0;
    for (const p of bySeason) {
      if (p.registrationStatus === "approved") approved += 1;
      else if (p.registrationStatus === "registered") registered += 1;
    }
    return { all: bySeason.length, approved, registered };
  }, [bySeason]);

  const countFor = (k: FilterKey) => (k === "all" ? counts.all : k === "approved" ? counts.approved : counts.registered);

  return (
    <div className="bg-[#fdf6ee]">
      <PageHeader
        title="参赛选手"
        subtitle={loadingPlayers || error ? undefined : `共 ${counts.all} 名选手，${counts.approved} 名已审核`}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <Button
              key={t.key}
              variant={filter === t.key ? "teal" : "outline"}
              size="sm"
              onClick={() => setFilter(t.key)}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  filter === t.key ? "bg-[#fdf6ee]/25" : "bg-[#fdf6ee] text-[#666666]",
                )}
              >
                {countFor(t.key)}
              </span>
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Label className="text-xs text-[#b0a898]">赛季</Label>
            <Select value={season ?? ""} onValueChange={setSeason}>
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
        </div>

        {loadingPlayers && <LoadingBlock label="正在加载参赛选手…" />}
        {error && (
          <ErrorBlock
            message={error}
            onRetry={() => void run(() => api.get<SessionUser[]>("/api/users"))}
          />
        )}

        {!loadingPlayers && !error && visible.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-[#b0a898]">暂无玩家报名</p>
          </div>
        )}

        {!loadingPlayers && !error && visible.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((p) => (
              <PlayerCard key={p.osuId} player={p} settings={settings} onSelect={setSelected} />
            ))}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          {selected && (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.username}
                  {statusBadge(selected.registrationStatus)}
                </DialogTitle>
                <DialogDescription>{selected.country ?? "未知地区"}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <Avatar className="h-24 w-24 rounded-2xl border-2 border-[#e0d8cc]">
                  <AvatarImage src={selected.avatarUrl ?? undefined} alt={selected.username} />
                  <AvatarFallback className="bg-[#f5c040]/30 text-2xl font-bold text-[#2d2d2d]">
                    {selected.username?.slice(0, 1).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border-2 border-[#e0d8cc] p-3">
                    <p className="text-xs text-[#b0a898]">PP</p>
                    <p className="mt-1 font-sans font-bold text-[#6b7fb5]">
                      {fmtInt(selected.pp)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border-2 border-[#e0d8cc] p-3">
                    <p className="text-xs text-[#b0a898]">世界排名</p>
                    <p className="mt-1 font-sans font-bold text-[#2d2d2d]">
                      {selected.globalRank != null ? `#${fmtInt(selected.globalRank)}` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border-2 border-[#e0d8cc] p-3">
                    <p className="text-xs text-[#b0a898]">地区排名</p>
                    <p className="mt-1 font-sans font-bold text-[#2d2d2d]">
                      {selected.countryRank != null ? `#${fmtInt(selected.countryRank)}` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border-2 border-[#e0d8cc] p-3">
                    <p className="text-xs text-[#b0a898]">osuID</p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#2d2d2d]">
                      {selected.osuId}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center rounded-xl border-2 border-[#e0d8cc] bg-white p-3">
                  <RadarChart skills={radarSkills(selected)} size={230} />
                </div>

                <div className="flex w-full flex-wrap justify-center gap-2">
                  <Button variant="teal" size="sm" onClick={() => void copyOsuId(selected.osuId)}>
                    <Copy className="h-4 w-4" />
                    复制 osuID
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <a
                      href={`https://osu.ppy.sh/users/${selected.osuId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      osu! 主页
                    </a>
                  </Button>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}
