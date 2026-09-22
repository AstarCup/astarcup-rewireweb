import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
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
import SeasonBadge from "@/components/SeasonBadge";
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
  if (!status || status === "not_registered") return null;
  switch (status) {
    case "approved":
      return (
        <Badge variant="teal" className="border-[#5cb8a5] bg-[#5cb8a5] text-[#fdf6ee]">
          已审核
        </Badge>
      );
    case "registered":
      return (
        <Badge variant="yellow" className="border-[#f5c040] bg-[#f5c040] text-(--pc-ink)">
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
          className="flex flex-col overflow-hidden rounded-2xl bg-(--pc-white) text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]"
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
            {player.registrationStatus && player.registrationStatus !== "not_registered" && (
              <span className="absolute right-2 top-2">
                {statusBadge(player.registrationStatus)}
              </span>
            )}
          </div>
          <div className="-mt-9 flex flex-col items-center gap-2 px-4 pb-4">
            <Avatar className="h-16 w-16 rounded-2xl border-4 border-white bg-(--pc-paper)">
              <AvatarImage src={player.avatarUrl ?? undefined} alt={player.username} />
              <AvatarFallback className="bg-[#f5c040]/30 text-lg font-bold text-(--pc-ink)">
                {player.username?.slice(0, 1).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-bold text-(--pc-ink)">{player.username}</p>
              <p className="mt-0.5 text-xs text-(--pc-faint)">{player.country ?? "-"}</p>
            </div>
            {/* 统计：PP / 世界排名 */}
            <div className="flex w-full items-center justify-around">
              <div className="flex-1">
                <p className="text-xs text-(--pc-faint)">PP</p>
                <p className="font-sans text-sm font-bold text-[#6b7fb5]">{fmtInt(player.pp)}</p>
              </div>
              <div className="w-px self-stretch bg-(--pc-border)" />
              <div className="flex-1">
                <p className="text-xs text-(--pc-faint)">世界排名</p>
                <p className="font-sans text-sm font-bold text-(--pc-ink)">
                  {player.globalRank != null ? `#${fmtInt(player.globalRank)}` : "-"}
                </p>
              </div>
            </div>
            {/* g0v0：头像 + 玩家名，置于最底部 */}
            <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-2 py-1">
              {player.guServerUserId || player.guServerUsername ? (
                <>
                  {player.guServerUserId && (
                    <img
                      src={`https://a.g0v0.top/${player.guServerUserId}`}
                      alt=""
                      className="h-5 w-5 rounded-full border border-(--pc-border) object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <span className="truncate text-xs font-bold text-[#5cb8a5]">
                    {player.guServerUsername || `#${player.guServerUserId}`}
                  </span>
                </>
              ) : (
                <span className="text-xs text-(--pc-faint)/60">未绑定 g0v0</span>
              )}
            </div>
          </div>
        </button>
      </HoverCardTrigger>
      {player.season && player.season.length > 0 && (
        <HoverCardContent side="top" align="center" className="max-w-[240px]">
          <p className="text-xs font-bold text-(--pc-faint)">已报名参赛过的赛季</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {player.season.map((s) => (
              <SeasonBadge key={s} season={s} label={seasonLabel(settings, s) || s} />
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

  // 已结束赛季：隐藏状态筛选，展示所有参加过该赛季的玩家（不检查报名状态）
  const isFinished = !!season && settings?.seasons?.[season]?.status === "finished";

  const loadedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (season === undefined) return;
    const needsAll = isFinished;
    if (loadedRef.current === needsAll) return;
    loadedRef.current = needsAll;
    void run(() =>
      api.get<SessionUser[]>(needsAll ? "/api/users?status=all" : "/api/users"),
    );
  }, [season, isFinished, run]);

  const players = data ?? [];
  const loadingPlayers = season === undefined || loading;

  const bySeason = useMemo(() => {
    if (!season) return players;
    return players.filter((p) => p.season?.includes(season));
  }, [players, season]);

  const visible = useMemo(() => {
    if (isFinished || filter === "all") return bySeason;
    return bySeason.filter((p) => p.registrationStatus === filter);
  }, [bySeason, filter, isFinished]);

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
    <div className="bg-(--pc-paper)">
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
                  filter === t.key ? "bg-(--pc-paper)/25" : "bg-(--pc-paper) text-(--pc-slate)",
                )}
              >
                {countFor(t.key)}
              </span>
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Label className="text-xs text-(--pc-faint)">赛季</Label>
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
          <div className="rounded-2xl bg-(--pc-white) p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-(--pc-faint)">暂无玩家报名</p>
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
            <DialogContent className="max-w-lg overflow-y-auto max-h-[85vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.username}
                  {statusBadge(selected.registrationStatus)}
                </DialogTitle>
                <DialogDescription>{selected.country ?? "未知地区"}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <Avatar className="h-24 w-24 rounded-2xl border-2 border-(--pc-border)">
                  <AvatarImage src={selected.avatarUrl ?? undefined} alt={selected.username} />
                  <AvatarFallback className="bg-[#f5c040]/30 text-2xl font-bold text-(--pc-ink)">
                    {selected.username?.slice(0, 1).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="rounded-xl bg-(--pc-white) border-2 border-(--pc-border) p-3">
                    <p className="text-xs text-(--pc-faint)">PP</p>
                    <p className="mt-1 font-sans font-bold text-[#6b7fb5]">
                      {fmtInt(selected.pp)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-(--pc-white) border-2 border-(--pc-border) p-3">
                    <p className="text-xs text-(--pc-faint)">世界排名</p>
                    <p className="mt-1 font-sans font-bold text-(--pc-ink)">
                      {selected.globalRank != null ? `#${fmtInt(selected.globalRank)}` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-(--pc-white) border-2 border-(--pc-border) p-3">
                    <p className="text-xs text-(--pc-faint)">地区排名</p>
                    <p className="mt-1 font-sans font-bold text-(--pc-ink)">
                      {selected.countryRank != null ? `#${fmtInt(selected.countryRank)}` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-(--pc-white) border-2 border-(--pc-border) p-3">
                    <p className="text-xs text-(--pc-faint)">osuID</p>
                    <p className="mt-1 font-mono text-sm font-bold text-(--pc-ink)">
                      {selected.osuId}
                    </p>
                  </div>
                </div>

                <div className="w-full rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3 text-center">
                  <p className="text-xs text-(--pc-faint)">g0v0 服务器玩家</p>
                  {selected.guServerUsername ? (
                    <div className="mt-1 flex items-center justify-center gap-2">
                      <img
                        src={`https://a.g0v0.top/${selected.guServerUserId}`}
                        alt=""
                        className="h-8 w-8 rounded-full border-2 border-(--pc-border) object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="font-bold text-[#5cb8a5]">
                        {selected.guServerUsername}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 font-bold text-(--pc-faint)">未绑定</p>
                  )}
                </div>

                <div className="flex justify-center rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3">
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
