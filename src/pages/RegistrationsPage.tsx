import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Copy, ExternalLink, Globe, MapPin, SmilePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import UserAvatar from "@/components/UserAvatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RadarChart from "@/components/ui/RadarChart";
import SeasonBadge from "@/components/SeasonBadge";
import EmojiPicker from "@/components/emoji/EmojiPicker";
import { useAsync } from "@/hooks/useFetch";
import { LoadingBlock, ErrorBlock } from "@/components/paper/feedback";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { EMOJI_MAP } from "@/lib/emoji-data";
import { cn, fmtInt } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { site } from "@/lib/site";
import { seasonOptions as buildSeasonOptions } from "@/lib/types";
import { seasonLabel } from "@/lib/types";
import type { PlayerSticker, SessionUser, Settings } from "@/lib/types";

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
        <Badge variant="teal" className="border-pc-teal bg-pc-teal text-pc-cream">
          已审核
        </Badge>
      );
    case "registered":
      return (
        <Badge variant="yellow" className="border-pc-yellow bg-pc-yellow text-(--pc-ink)">
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

/** 已结束赛季需拉全量用户（不限报名状态） */
const usersUrl = (all: boolean) => (all ? "/api/users?status=all" : "/api/users");

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
    return;
  } catch {
    // 非安全上下文 / 无剪贴板权限时退回 execCommand
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = osuId;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (ok) toast({ title: "已复制 osuID", description: osuId });
    else toast({ variant: "destructive", title: "复制失败" });
  } catch {
    toast({ variant: "destructive", title: "复制失败" });
  }
}

interface PlayerCardProps {
  player: SessionUser;
  settings: Settings | null;
  stickers: PlayerSticker[];
  /** 当前处于「放置表情」模式时，这里是待放置的 token */
  placingToken: string | null;
  /** 当前登录用户 osuId（未登录为空） */
  viewerOsuId: string | null;
  isAdmin: boolean;
  onSelect: (p: SessionUser) => void;
  onAddSticker: (p: SessionUser) => void;
  onPlaceSticker: (p: SessionUser, token: string, x: number, y: number) => void;
  onDeleteSticker: (s: PlayerSticker) => void;
}

function PlayerCard({
  player,
  settings,
  stickers,
  placingToken,
  viewerOsuId,
  isAdmin,
  onSelect,
  onAddSticker,
  onPlaceSticker,
  onDeleteSticker,
}: PlayerCardProps) {
  const cover = coverUrl(player);
  // 只有「使用 g0v0 比赛」开启时才展示 g0v0 绑定信息
  const showGv0 = String(settings?.use_gv0 ?? false) === "true";
  const cardRef = useRef<HTMLDivElement>(null);
  // 放置模式下跟随鼠标的预览位置（0–1）
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const placingSrc = placingToken ? EMOJI_MAP[placingToken] : undefined;

  // 移动端长按加表情：按住 480ms 触发，移动超过 12px 视为滚动
  const longPressTimer = useRef<number | null>(null);
  const longPressReady = useRef(false);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressReady.current = false;
    pressStart.current = null;
  };

  useEffect(() => cancelLongPress, []);

  const onCardPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch" || placingToken) return;
    cancelLongPress();
    pressStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      longPressReady.current = true;
      navigator.vibrate?.(12);
    }, 480);
  };

  const onCardPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pressStart.current) return;
    const dx = e.clientX - pressStart.current.x;
    const dy = e.clientY - pressStart.current.y;
    if (dx * dx + dy * dy > 12 * 12) cancelLongPress();
  };

  const onCardPointerUp = () => {
    const triggered = longPressReady.current;
    cancelLongPress();
    if (!triggered) return;
    // 长按后紧跟的 click 不能再打开详情
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 500);
    onAddSticker(player);
  };

  const ratio = (e: { clientX: number; clientY: number }) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          ref={cardRef}
          className="group relative h-full"
          onPointerDown={onCardPointerDown}
          onPointerMove={onCardPointerMove}
          onPointerUp={onCardPointerUp}
          onPointerCancel={cancelLongPress}
          onPointerLeave={cancelLongPress}
        >
          <button
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onSelect(player);
            }}
            className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-(--pc-white) text-left shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]"
          >
            {/* 封面 + 世界/地区排名 */}
            <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-pc-teal/40 to-pc-blue/40">
              {cover && (
                <img
                  src={cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/10" />
              <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                <span
                  title="世界排名"
                  className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm"
                >
                  <Globe className="h-3 w-3" />
                  {player.globalRank != null ? `#${fmtInt(player.globalRank)}` : "#-"}
                </span>
                <span
                  title="地区排名"
                  className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm"
                >
                  <MapPin className="h-3 w-3" />
                  {player.countryRank != null ? `#${fmtInt(player.countryRank)}` : "#-"}
                </span>
              </div>
              {player.registrationStatus && player.registrationStatus !== "not_registered" && (
                <span className="absolute right-2 top-2">
                  {statusBadge(player.registrationStatus)}
                </span>
              )}
            </div>

            {/* 头像压在封面右下角，下面是玩家名 */}
            <div className="relative flex flex-1 flex-col px-3 pb-3 pt-2">
              <UserAvatar
                username={player.username}
                avatarUrl={player.avatarUrl}
                osuId={player.osuId}
                className="absolute -top-8 right-3 h-16 w-16 rounded-xl border-4 border-(--pc-white) bg-(--pc-paper) shadow-[2px_2px_0px_rgba(0,0,0,0.08)]"
                fallbackClassName="bg-pc-yellow/30 text-base font-bold text-(--pc-ink)"
                uppercase
              />
              <div className="min-w-0 pr-20">
                <p className="truncate text-[15px] font-bold leading-tight text-(--pc-ink)">
                  {player.username}
                </p>
                <p className="mt-1 truncate text-xs text-(--pc-faint)">
                  {player.country ?? "-"} · {fmtInt(player.pp)}pp
                </p>
              </div>
              {/* g0v0：头像 + 玩家名（未启用 g0v0 比赛时不显示） */}
              {showGv0 && (
                <div className="mt-auto flex items-center gap-1.5 pt-2">
                  {player.guServerUserId || player.guServerUsername ? (
                    <>
                      {player.guServerUserId && (
                        <img
                          src={site.urls.g0v0Avatar(player.guServerUserId)}
                          alt=""
                          loading="lazy"
                          className="h-4 w-4 rounded-full border border-(--pc-border) object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <span className="truncate text-[11px] font-bold text-pc-teal">
                        {player.guServerUsername || `#${player.guServerUserId}`}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-(--pc-faint)/70">未绑定 g0v0</span>
                  )}
                </div>
              )}
            </div>
          </button>

          {/* 贴在卡片上的表情（绝对定位，0–1 相对坐标） */}
          {stickers.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-20">
              {stickers.map((s) => {
                const src = EMOJI_MAP[s.token];
                if (!src) return null;
                const removable = isAdmin || (viewerOsuId != null && s.createdBy === viewerOsuId);
                return (
                  <span
                    key={s.id}
                    className="group/sticker pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
                  >
                    <img
                      src={src}
                      alt={s.token}
                      title={`:${s.token}:`}
                      loading="lazy"
                      decoding="async"
                      className="h-9 w-9 object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]"
                    />
                    {removable && !placingToken && (
                      <button
                        type="button"
                        title="删除这个表情"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSticker(s);
                        }}
                        className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-(--pc-ink) text-white group-hover/sticker:grid hover:bg-pc-primary"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* 贴表情入口：只在登录后显示，hover 卡片时出现在封面右上 */}
          {viewerOsuId && !placingToken && (
            <button
              type="button"
              title="贴一个表情"
              onClick={(e) => {
                e.stopPropagation();
                onAddSticker(player);
              }}
              className="absolute right-2 top-11 z-30 hidden h-7 w-7 place-items-center rounded-full border-2 border-(--pc-border) bg-(--pc-white)/90 text-(--pc-slate) shadow-[1px_1px_0_rgba(0,0,0,0.08)] backdrop-blur-sm group-hover:grid hover:border-pc-primary hover:text-pc-primary max-md:grid"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
          )}

          {/* 放置模式：点卡片任意位置贴上去 */}
          {placingToken && (
            <button
              type="button"
              aria-label="点击卡片放置表情"
              className="absolute inset-0 z-40 cursor-crosshair rounded-2xl bg-pc-primary/5 ring-2 ring-pc-primary/50"
              onMouseMove={(e) => setPreview(ratio(e))}
              onMouseLeave={() => setPreview(null)}
              onClick={(e) => {
                const { x, y } = ratio(e);
                setPreview(null);
                onPlaceSticker(player, placingToken, x, y);
              }}
            >
              {placingSrc && preview && (
                <img
                  src={placingSrc}
                  alt=""
                  className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 opacity-80"
                  style={{ left: `${preview.x * 100}%`, top: `${preview.y * 100}%` }}
                />
              )}
              {!preview && (
                <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pc-primary px-2 py-0.5 text-[10px] font-bold text-pc-cream">
                  点击卡片放置表情
                </span>
              )}
            </button>
          )}
        </div>
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
  const { settings, user, permissions } = useApp();
  const isAdmin = !!permissions?.isadmin;
  const seasonOptions = buildSeasonOptions(settings);
  const { data, loading, error, run } = useAsync<SessionUser[]>();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [season, setSeason] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<SessionUser | null>(null);

  // ---- 表情贴纸 ----
  const [stickers, setStickers] = useState<Record<string, PlayerSticker[]>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPlayer, setPickerPlayer] = useState<SessionUser | null>(null);
  const [placing, setPlacing] = useState<{ osuId: string; token: string } | null>(null);

  // 贴纸和玩家列表并行拉取，不阻塞卡片渲染
  useEffect(() => {
    let cancelled = false;
    void api.get<PlayerSticker[]>("/api/stickers").then((res) => {
      if (cancelled || !res.ok) return;
      const grouped: Record<string, PlayerSticker[]> = {};
      for (const s of res.data) (grouped[s.osuId] ??= []).push(s);
      setStickers(grouped);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 放置模式按 Esc 取消
  useEffect(() => {
    if (!placing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlacing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placing]);

  const openStickerPicker = (p: SessionUser) => {
    if (!user) {
      toast({ title: "请先登录后再贴表情" });
      return;
    }
    setPlacing(null);
    setPickerPlayer(p);
    setPickerOpen(true);
  };

  const placeSticker = async (p: SessionUser, token: string, x: number, y: number) => {
    setPlacing(null);
    const res = await api.post<PlayerSticker>("/api/stickers", {
      osuId: p.osuId,
      token,
      x,
      y,
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "贴表情失败", description: res.error.message });
      return;
    }
    setStickers((prev) => ({
      ...prev,
      [p.osuId]: [...(prev[p.osuId] ?? []), res.data],
    }));
  };

  const deleteSticker = async (s: PlayerSticker) => {
    const res = await api.delete(`/api/stickers/${s.id}`);
    if (!res.ok) {
      toast({ variant: "destructive", title: "删除失败", description: res.error.message });
      return;
    }
    setStickers((prev) => ({
      ...prev,
      [s.osuId]: (prev[s.osuId] ?? []).filter((it) => it.id !== s.id),
    }));
  };

  const currentSeason = settings?.current_season;

  // 默认取当前赛季；仅当用户尚未选择时填充，选择「全部」("") 后不再覆盖
  useEffect(() => {
    if (!settings) return;
    setSeason((s) => (s === undefined ? (currentSeason ?? "") : s));
  }, [settings, currentSeason]);

  // 已结束赛季：隐藏状态筛选，展示所有参加过该赛季的玩家（不检查报名状态）
  const isFinished = !!season && settings?.seasons?.[season]?.status === "finished";

  const loadedRef = useRef<boolean | null>(null);
  // 仅在成功后置位缓存标记，保证失败/重试后不会跳过拉取
  const loadUsers = useCallback(
    (all: boolean) =>
      run(() => api.get<SessionUser[]>(usersUrl(all))).then((res) => {
        if (res.ok) loadedRef.current = all;
        return res;
      }),
    [run],
  );
  useEffect(() => {
    if (season === undefined) return;
    if (loadedRef.current === isFinished) return;
    void loadUsers(isFinished);
  }, [season, isFinished, loadUsers]);

  const players = useMemo(() => data ?? [], [data]);
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

  const countFor = (k: FilterKey) =>
    k === "all" ? counts.all : k === "approved" ? counts.approved : counts.registered;

  return (
    <div className="bg-(--pc-paper)">
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
        {error && <ErrorBlock message={error} onRetry={() => void loadUsers(isFinished)} />}

        {!loadingPlayers && !error && visible.length === 0 && (
          <div className="rounded-2xl bg-(--pc-white) p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-(--pc-faint)">暂无玩家报名</p>
          </div>
        )}

        {!loadingPlayers && !error && visible.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {visible.map((p) => (
              <PlayerCard
                key={p.osuId}
                player={p}
                settings={settings}
                stickers={stickers[p.osuId] ?? []}
                placingToken={placing?.osuId === p.osuId ? placing.token : null}
                viewerOsuId={user?.osuId ?? null}
                isAdmin={isAdmin}
                onSelect={setSelected}
                onAddSticker={openStickerPicker}
                onPlaceSticker={placeSticker}
                onDeleteSticker={deleteSticker}
              />
            ))}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          {selected && (
            <DialogContent
              className="max-h-[85vh] max-w-4xl overflow-y-auto p-0"
              closeClassName="border-2 border-(--pc-border) bg-(--pc-white) p-2 opacity-100 shadow-[2px_2px_0px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              {/* 顶部封面 + 头像 + 名字/地区 + 右上操作 */}
              <div className="relative">
                <div
                  className="h-28 w-full bg-cover bg-center bg-gradient-to-br from-pc-teal/30 to-pc-blue/30"
                  style={
                    coverUrl(selected)
                      ? {
                          backgroundImage:
                            `url(${coverUrl(selected)}), ` +
                            "linear-gradient(135deg, rgba(92,184,165,.45), rgba(107,127,181,.45))",
                        }
                      : undefined
                  }
                />
                <div className="absolute right-14 top-4 flex flex-wrap items-center justify-end gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={site.urls.osuUser(selected.osuId)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      osu! 主页
                    </a>
                  </Button>
                </div>

                <div className="relative -mt-12 flex items-end gap-4 px-6">
                  <UserAvatar
                    username={selected.username}
                    avatarUrl={selected.avatarUrl}
                    osuId={selected.osuId}
                    className="h-24 w-24 rounded-2xl border-2 border-(--pc-border) bg-(--pc-white)"
                    fallbackClassName="bg-pc-yellow/30 text-2xl font-bold text-(--pc-ink)"
                    uppercase
                  />
                  <div className="min-w-0 pb-1">
                    <DialogTitle className="flex flex-wrap items-center gap-2">
                      {selected.username}
                      {statusBadge(selected.registrationStatus)}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {selected.country ?? "未知地区"}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* 左：数据 + 参加过赛季；右：雷达图 */}
              <div className="grid gap-6 px-6 pb-6 pt-4 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex flex-col gap-4">
                  <div className="grid w-full grid-cols-2 gap-3">
                    <div className="rounded-xl bg-(--pc-white) border-2 border-(--pc-border) p-3">
                      <p className="text-xs text-(--pc-faint)">PP</p>
                      <p className="mt-1 font-sans text-2xl font-bold text-pc-blue">
                        {fmtInt(selected.pp)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-(--pc-white) border-2 border-(--pc-border) p-3">
                      <p className="text-xs text-(--pc-faint)">世界排名</p>
                      <p className="mt-1 font-sans text-2xl font-bold text-(--pc-ink)">
                        {selected.globalRank != null ? `#${fmtInt(selected.globalRank)}` : "-"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-(--pc-white) border-2 border-(--pc-border) p-3">
                      <p className="text-xs text-(--pc-faint)">地区排名</p>
                      <p className="mt-1 font-sans text-2xl font-bold text-(--pc-ink)">
                        {selected.countryRank != null ? `#${fmtInt(selected.countryRank)}` : "-"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyOsuId(selected.osuId)}
                      className="group rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-pc-teal"
                      title="点击复制 osuID"
                    >
                      <span className="flex items-center justify-between text-xs text-(--pc-faint)">
                        osuID
                        <Copy className="h-3.5 w-3.5 opacity-60 transition group-hover:text-pc-teal group-hover:opacity-100" />
                      </span>
                      <span className="mt-1 block font-mono text-lg font-bold text-(--pc-ink)">
                        {selected.osuId}
                      </span>
                    </button>
                  </div>

                  {/* 参加过的赛季 banner */}
                  <div className="rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3">
                    <p className="text-xs text-(--pc-faint)">参加过的赛季</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(selected.season ?? []).length > 0 ? (
                        (selected.season ?? []).map((s) => (
                          <SeasonBadge key={s} season={s} label={seasonLabel(settings, s) || s} />
                        ))
                      ) : (
                        <span className="text-sm text-(--pc-faint)">—</span>
                      )}
                    </div>
                  </div>

                  {String(settings?.use_gv0 ?? false) === "true" && (
                    <div className="w-full rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3">
                      <p className="text-xs text-(--pc-faint)">g0v0 服务器玩家</p>
                      {selected.guServerUserId || selected.guServerUsername ? (
                        <div className="mt-1 flex items-center gap-2">
                          {selected.guServerUserId && (
                            <img
                              src={site.urls.g0v0Avatar(selected.guServerUserId)}
                              alt=""
                              className="h-8 w-8 rounded-full border-2 border-(--pc-border) object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <span className="font-bold text-pc-teal">
                            {selected.guServerUsername || `#${selected.guServerUserId}`}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 font-bold text-(--pc-faint)">未绑定</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-center rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-3 md:self-start">
                  <RadarChart skills={radarSkills(selected)} size={230} />
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>

        {/* 全局表情选择器：选完后进入放置模式，点卡片定位 */}
        <EmojiPicker
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) setPickerPlayer(null);
          }}
          onPick={(token) => {
            if (pickerPlayer) setPlacing({ osuId: pickerPlayer.osuId, token });
          }}
        />
      </div>
    </div>
  );
}
