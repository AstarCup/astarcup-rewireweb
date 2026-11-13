import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  History,
  Map as MapIcon,
  MessageCircle,
  SmilePlus,
  Users,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { site } from "@/lib/site";
import { cn, osuAvatarUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AnimatedLogo from "@/components/layout/AnimatedLogo";
import BoardStickers, { BOARD_W, BOARD_H } from "@/components/home/BoardStickers";
import EmojiPicker from "@/components/emoji/EmojiPicker";
import winners from "@/data/winners.json";
import RegisterDialog from "@/components/RegisterDialog";
import { REG_STATUS_LABEL } from "@/lib/types";
import type { CanvasSticker, NewsItem } from "@/lib/types";
import { useFetch } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface WinnerCard {
  id: string;
  playerName: string;
  osuId: string;
  avatarUrl: string;
  rank: number;
  country: string;
  season: string;
}
interface WinnersData {
  cards: WinnerCard[];
}

const winnersData = winners as WinnersData;

/** 画布逻辑尺寸由 BoardStickers 导出（贴纸与画布共用同一坐标系） */

/** 拖拽限位：左右 300px、上下 400px；超出部分做阻尼，松手后缓回 */
const LIMIT_X = 300;
const LIMIT_Y = 400;

const clampX = (v: number) => Math.max(-LIMIT_X, Math.min(LIMIT_X, v));
const clampY = (v: number) => Math.max(-LIMIT_Y, Math.min(LIMIT_Y, v));

/** 到达限位后继续拖会越来越沉（橡皮筋） */
function rubberBand(v: number, limit: number) {
  const abs = Math.abs(v);
  if (abs <= limit) return v;
  const over = Math.min((abs - limit) * 0.3, limit * 0.3);
  return Math.sign(v) * (limit + over);
}

const eventCards = [
  { to: "/guide", label: "比赛手册", Icon: BookOpen, color: "var(--pc-primary)", x: 696, y: 153 },
  {
    to: "/schedule",
    label: "赛程安排",
    Icon: CalendarDays,
    color: "var(--pc-teal)",
    x: 861,
    y: 125,
  },
  { to: "/mappool", label: "图池", Icon: MapIcon, color: "var(--pc-blue)", x: 1013, y: 146 },
  {
    to: "/registrations",
    label: "参赛选手",
    Icon: Users,
    color: "var(--pc-yellow)",
    x: 522,
    y: 178,
  },
  {
    to: "/contact",
    label: "联系我们",
    Icon: MessageCircle,
    color: "var(--pc-primary)",
    x: 1110,
    y: 186,
  },
];

const community = [
  { label: "QQ群", href: site.contact.qqGroup, color: "var(--pc-teal)", x: 498, y: 300 },
  { label: "bilibili", href: site.contact.bilibili, color: "var(--pc-blue)", x: 419, y: 383 },
  {
    label: "bilibili live",
    href: site.contact.bilibiliLive,
    color: "var(--pc-primary)",
    x: 440,
    y: 464,
  },
];

const projectLinks = [
  { label: "osu! Plus Plus", desc: "OPP 工具箱", to: "/tools" },
  { label: "Ez2Lazer", desc: "支持 ASIO 的客户端", to: "/tools" },
  { label: "g0v0 lazer", desc: "咕服专用客户端", to: "/tools" },
];

const cardBase =
  "flex items-center gap-2.5 rounded-[22px] border-2 border-(--pc-border) bg-(--pc-white)/95 px-4 py-2.5 " +
  "shadow-[3px_3px_0px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5";

const DECOR_COLORS = ["var(--pc-primary)", "var(--pc-teal)", "var(--pc-blue)", "var(--pc-yellow)"];

const panelBase =
  "rounded-2xl border-2 border-(--pc-border) bg-(--pc-white) p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]";

/** 画布上一块：绝对像素定位 */
function Piece({
  x,
  y,
  rotate = 0,
  width,
  className,
  children,
}: {
  x: number;
  y: number;
  rotate?: number;
  width?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("absolute", className)}
      style={
        {
          left: x,
          top: y,
          width,
          transform: `rotate(${rotate}deg)`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const { user, permissions } = useApp();
  const { data: newsData } = useFetch<NewsItem[]>(() => api.get("/api/news"));
  const news = (newsData ?? []).slice(0, 3);

  const [registerOpen, setRegisterOpen] = useState(false);
  const isAdmin = !!permissions?.isadmin;
  const regStatus = user?.registrationStatus ?? "not_registered";

  // ---- 画布贴纸 ----
  const [boardStickers, setBoardStickers] = useState<CanvasSticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<number | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const stickersRef = useRef<CanvasSticker[]>([]);
  stickersRef.current = boardStickers;

  // 贴纸与其它数据并行加载，不阻塞画布
  useEffect(() => {
    let cancelled = false;
    void api.get<CanvasSticker[]>("/api/canvas-stickers?page=home").then((res) => {
      if (!cancelled && res.ok) setBoardStickers(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canEditSticker = (s: CanvasSticker) => !!user && (s.createdBy === user.osuId || isAdmin);

  const draftSticker = (
    id: number,
    patch: Partial<Pick<CanvasSticker, "x" | "y" | "scale" | "rotation">>,
  ) => {
    setBoardStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  // 拖动结束才落库，避免每帧请求
  const commitSticker = async (id: number) => {
    const s = stickersRef.current.find((it) => it.id === id);
    if (!s) return;
    const res = await api.patch(`/api/canvas-stickers/${id}`, {
      x: s.x,
      y: s.y,
      scale: s.scale,
      rotation: s.rotation,
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "保存贴纸失败", description: res.error.message });
    }
  };

  const deleteBoardSticker = async (s: CanvasSticker) => {
    const res = await api.delete(`/api/canvas-stickers/${s.id}`);
    if (!res.ok) {
      toast({ variant: "destructive", title: "删除失败", description: res.error.message });
      return;
    }
    setBoardStickers((prev) => prev.filter((it) => it.id !== s.id));
    setSelectedSticker((cur) => (cur === s.id ? null : cur));
  };

  const addBoardSticker = async (token: string) => {
    const res = await api.post<CanvasSticker>("/api/canvas-stickers", {
      page: "home",
      token,
      x: BOARD_W / 2,
      y: BOARD_H / 2,
      scale: 1,
      rotation: 0,
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "贴表情失败", description: res.error.message });
      return;
    }
    setBoardStickers((prev) => [...prev, res.data]);
    setSelectedSticker(res.data.id);
  };

  const champion = [...winnersData.cards].sort((a, b) => a.rank - b.rank)[0];

  // 每次刷新随机点亮 6 个字符（每行一个），用品牌色实心填充
  const [litChars] = useState(() =>
    Array.from({ length: 6 }, (_, line) => ({
      line,
      index: Math.floor(Math.random() * 8),
      color: DECOR_COLORS[Math.floor(Math.random() * DECOR_COLORS.length)],
    })),
  );

  // 画布整体缩放，保证固定坐标系的元素始终完整可见
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min(width / BOARD_W, height / BOARD_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 整块场地一起拖动
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);
  // 松手后回弹中（用于切换弹簧缓动）
  const [settling, setSettling] = useState(false);
  /** 超出限位时，松手弹回边界 */
  const settleBack = () => {
    setOffset((prev) => {
      const next = { x: clampX(prev.x), y: clampY(prev.y) };
      if (next.x !== prev.x || next.y !== prev.y) {
        setSettling(true);
        window.setTimeout(() => setSettling(false), 440);
      }
      return next;
    });
  };

  // 滚轮先带动画布；画布到边界后，才把滚动交还给页面
  const [wheeling, setWheeling] = useState(false);
  const wheelTimer = useRef<number | null>(null);
  // 监听只注册一次，滚动时读 ref，避免每次 offset 变化都重建监听
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const cur = offsetRef.current;
      const nextX = clampX(cur.x - e.deltaX);
      const nextY = clampY(cur.y - e.deltaY);
      if (nextX === cur.x && nextY === cur.y) return; // 到边界了，交给页面滚动
      e.preventDefault();
      setOffset({ x: nextX, y: nextY });
      setWheeling(true);
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => setWheeling(false), 160);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    };
  }, []);

  return (
    <div className="relative bg-(--pc-paper)">
      {/* ================= 桌面：固定尺寸画布，整块一起拖 ================= */}
      <section
        ref={stageRef}
        className="relative -mt-[4.125rem] hidden h-[100svh] touch-none overflow-hidden select-none xl:block"
        onPointerDown={(e) => {
          setSelectedSticker(null);
          drag.current = {
            id: e.pointerId,
            sx: e.clientX,
            sy: e.clientY,
            ox: offset.x,
            oy: offset.y,
          };
          moved.current = false;
          setDragging(true);
          // 先不 capture，否则 click 会落在 section 上，按钮/链接点了没反应
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const dx = (e.clientX - d.sx) / scale;
          const dy = (e.clientY - d.sy) / scale;
          if (!moved.current) {
            if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return; // 还在点击范围内
            moved.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }
          setOffset({ x: rubberBand(d.ox + dx, LIMIT_X), y: rubberBand(d.oy + dy, LIMIT_Y) });
        }}
        onPointerUp={() => {
          drag.current = null;
          setDragging(false);
          settleBack();
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          settleBack();
        }}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            // 只吞掉拖动结束后的这一下，避免影响后续按钮点击
            moved.current = false;
          }
        }}
      >
        {/* 缩放容器：把 1600×900 的画布等比缩放到视口里 */}
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* 拖动层：画布里的所有东西一起位移 */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
              transition: dragging
                ? "none"
                : settling
                  ? "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : wheeling
                    ? "transform 140ms linear"
                    : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
              cursor: dragging ? "grabbing" : "grab",
            }}
          >
            {/* 最底层背景图 */}
            <img
              src="/assets/banner.png"
              alt=""
              decoding="async"
              className="pointer-events-none absolute -top-[700px] -left-[700px] h-[2300px] w-[3000px] max-w-none object-cover select-none"
              draggable={false}
            />

            {/* 背景装饰：六行超大描边字，每次刷新随机点亮 6 个实心字符 */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <svg
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                width={2000}
                height={2400}
                viewBox="0 0 2000 2400"
                fill="none"
              >
                {[0.05, 0.08, 0.1, 0.12, 0.14, 0.16].map((lineOpacity, line) => (
                  <g key={line}>
                    {"ASTARCUP".split("").map((ch, i) => {
                      const lit = litChars.find((c) => c.line === line && c.index === i);
                      return (
                        <text
                          key={i}
                          x={1000 + (i - 3.5) * 245}
                          y={200 + line * 360}
                          textAnchor="middle"
                          fontSize={380}
                          fontWeight={900}
                          className="font-display"
                          fill={lit ? lit.color : "none"}
                          stroke={lit ? "none" : "var(--pc-ink)"}
                          strokeWidth={lit ? 0 : 1}
                          opacity={lit ? 1 : lineOpacity}
                        >
                          {ch}
                        </text>
                      );
                    })}
                  </g>
                ))}
              </svg>
            </div>
            {/* 中心 Logo */}
            <Piece x={440} y={114} width={1000} className="pointer-events-none">
              <AnimatedLogo />
            </Piece>

            {/* 赛事板块 */}
            {[
              {
                key: "guide",
                x: 696,
                y: 93,
                rotate: -3,
                color: eventCards[0].color,
                label: "比赛手册",
                to: "/guide",
                Icon: BookOpen,
              },
              {
                key: "schedule",
                x: 861,
                y: 125,
                rotate: 2,
                color: eventCards[1].color,
                label: "赛程安排",
                to: "/schedule",
                Icon: CalendarDays,
              },
              {
                key: "mappool",
                x: 1013,
                y: 146,
                rotate: -2,
                color: eventCards[2].color,
                label: "图池",
                to: "/mappool",
                Icon: MapIcon,
              },
              {
                key: "contact",
                x: 1310,
                y: 126,
                rotate: 3,
                color: eventCards[4].color,
                label: "联系我们",
                to: "/contact",
                Icon: MessageCircle,
              },
              {
                key: "players",
                x: 522,
                y: 178,
                rotate: -4,
                color: eventCards[3].color,
                label: "参赛选手",
                to: "/registrations",
                Icon: Users,
              },
            ].map((c) => (
              <Piece key={c.key} x={c.x} y={c.y} rotate={c.rotate}>
                <div className="relative">
                  {/* 吊线：4px 宽、1000px 高，压在按钮下面 */}
                  <span
                    aria-hidden
                    className="absolute -top-[1000px] left-[26px] h-[1000px] w-[4px] rounded-full opacity-60"
                    style={{ backgroundColor: c.color }}
                  />
                  <Link to={c.to} className={cn(cardBase, "relative")}>
                    <c.Icon className="h-6 w-6 shrink-0" style={{ color: c.color }} />
                    <span className="text-base font-bold whitespace-nowrap text-(--pc-ink)">
                      {c.label}
                    </span>
                  </Link>
                </div>
              </Piece>
            ))}

            {/* 左侧社群 */}
            {community.map((c, i) => (
              <Piece key={c.label} x={c.x} y={c.y} rotate={i % 2 ? 2 : -2}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3"
                >
                  <span className="text-xs font-bold whitespace-nowrap text-(--pc-slate)">
                    {c.label}
                  </span>
                  <span
                    className="grid h-12 w-12 place-items-center rounded-full border-2 border-(--pc-border) text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-transform hover:scale-110"
                    style={{ backgroundColor: c.color }}
                  >
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </a>
              </Piece>
            ))}

            {/* 卫冕冠军 */}
            {champion && (
              <Piece x={298} y={585} rotate={-2}>
                <div className="relative">
                  {/* 左右两根吊线 */}
                  <span
                    aria-hidden
                    className="absolute -top-[1000px] left-[24px] h-[1000px] w-[4px] rounded-full bg-(--pc-ink) opacity-25"
                  />
                  <span
                    aria-hidden
                    className="absolute -top-[1000px] right-[24px] h-[1000px] w-[4px] rounded-full bg-(--pc-ink) opacity-25"
                  />
                  <div className="relative flex items-center gap-2 rounded-2xl border-2 border-(--pc-border) bg-(--pc-white)/95 px-3 py-2 shadow-[3px_3px_0px_rgba(0,0,0,0.1)] backdrop-blur-sm">
                    <img
                      src={champion.avatarUrl || osuAvatarUrl(champion.osuId)}
                      alt={champion.playerName}
                      className="h-8 w-8 rounded-lg border-2 border-(--pc-border) object-cover"
                    />
                    <span>
                      <span className="block text-xs font-bold text-(--pc-ink)">
                        {champion.playerName}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-(--pc-faint)">
                        <History className="h-3 w-3" /> 卫冕冠军
                      </span>
                    </span>
                    <Badge variant="yellow" className="text-[10px]">
                      S1
                    </Badge>
                  </div>
                </div>
              </Piece>
            )}

            {/* 项目与工具 */}
            <Piece x={350} y={744} width={250} rotate={-1.5}>
              <div className={panelBase}>
                <p className="text-[10px] font-bold tracking-[0.18em] text-(--pc-faint) uppercase">
                  Tools
                </p>
                <p className="mt-0.5 text-base font-black text-(--pc-ink)">项目与工具</p>
                <div className="mt-2 grid gap-1">
                  {projectLinks.map((l) => (
                    <Link
                      key={l.label}
                      to={l.to}
                      className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 text-xs transition hover:bg-pc-primary/10"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-(--pc-ink)">{l.label}</span>
                        <span className="block text-[10px] text-(--pc-faint)">{l.desc}</span>
                      </span>
                      <ArrowUpRight className="h-3 w-3 shrink-0 text-(--pc-faint)" />
                    </Link>
                  ))}
                </div>
              </div>
            </Piece>

            {/* 最新资讯 */}
            <Piece x={634} y={730} width={740} rotate={1.5}>
              <div className={panelBase}>
                <p className="text-[10px] font-bold tracking-[0.18em] text-(--pc-faint) uppercase">
                  News
                </p>
                <p className="mt-0.5 text-base font-black text-(--pc-ink)">最新资讯</p>
                <div className="mt-2 grid gap-1">
                  {news.length > 0 ? (
                    news.map((n) => (
                      <Link
                        key={n.slug}
                        to={`/news/${n.slug}`}
                        className="block rounded-lg px-1.5 py-1.5 transition hover:bg-pc-yellow/15"
                      >
                        <span className="line-clamp-1 text-xs font-bold text-(--pc-ink)">
                          {n.title || "未命名资讯"}
                        </span>
                        {n.date && <span className="text-[10px] text-(--pc-faint)">{n.date}</span>}
                      </Link>
                    ))
                  ) : (
                    <p className="px-1.5 py-1.5 text-xs text-(--pc-faint)">暂无资讯</p>
                  )}
                </div>
              </div>
            </Piece>

            {/* 操作 */}
            <Piece x={795} y={690} rotate={-2}>
              {!user ? (
                <Button
                  asChild
                  variant="yellow"
                  size="lg"
                  className="h-14 px-10 text-lg shadow-[4px_4px_0px_rgba(0,0,0,0.14)]"
                >
                  <Link to="/register">登录 / 报名</Link>
                </Button>
              ) : regStatus === "not_registered" ? (
                <Button
                  variant="yellow"
                  size="lg"
                  className="h-14 px-10 text-lg shadow-[4px_4px_0px_rgba(0,0,0,0.14)]"
                  onClick={() => setRegisterOpen(true)}
                >
                  快速报名
                </Button>
              ) : (
                <Button
                  variant="yellow"
                  size="lg"
                  disabled
                  className="h-14 px-10 text-lg shadow-[4px_4px_0px_rgba(0,0,0,0.14)]"
                >
                  {REG_STATUS_LABEL[regStatus] ?? regStatus}
                </Button>
              )}
            </Piece>

            {user && (
              <Piece x={1000} y={686} rotate={2}>
                <Button
                  asChild
                  variant="primary"
                  size="lg"
                  className="shadow-[4px_4px_0px_rgba(0,0,0,0.14)]"
                >
                  <Link to="/player-info">个人中心</Link>
                </Button>
              </Piece>
            )}

            {user && isAdmin && (
              <Piece x={1184} y={712} rotate={-3}>
                <Button
                  asChild
                  variant="teal"
                  size="lg"
                  className="shadow-[4px_4px_0px_rgba(0,0,0,0.14)]"
                >
                  <Link to="/staff-dashboard">管理后台</Link>
                </Button>
              </Piece>
            )}

            {/* 画布贴纸（可拖动 / 缩放 / 旋转） */}
            <BoardStickers
              stickers={boardStickers}
              boardScale={scale}
              selectedId={selectedSticker}
              editable={canEditSticker}
              onSelect={setSelectedSticker}
              onDraft={draftSticker}
              onCommit={commitSticker}
              onDelete={deleteBoardSticker}
            />
          </div>
        </div>

        {/* 贴表情入口（登录后显示） */}
        {user && (
          <button
            type="button"
            title="在画布上贴一个表情"
            onPointerDown={(e) => {
              // 按钮不参与画布拖动；同时清掉「刚拖过画布」的标记，
              // 否则 section 的 onClickCapture 会把这次点击吞掉
              moved.current = false;
              e.stopPropagation();
            }}
            onClick={() => setStickerPickerOpen(true)}
            className="absolute bottom-20 left-6 z-40 flex items-center gap-2 rounded-full border-2 border-(--pc-border) bg-(--pc-white) px-3.5 py-2 text-xs font-bold text-(--pc-slate) shadow-[3px_3px_0px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-pc-primary hover:text-pc-primary"
          >
            <SmilePlus className="h-4 w-4" />
            贴表情
          </button>
        )}
      </section>

      {/* ================= 窄屏：竖排 ================= */}
      <section className="xl:hidden">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-10">
          <div className="-mb-8 w-full max-w-[320px] [&_svg]:h-auto [&_svg]:w-full sm:max-w-[380px]">
            <AnimatedLogo />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {!user ? (
              <Button asChild size="lg" variant="primary">
                <Link to="/register">登录 / 报名</Link>
              </Button>
            ) : (
              <>
                {regStatus === "not_registered" ? (
                  <Button size="lg" variant="yellow" onClick={() => setRegisterOpen(true)}>
                    快速报名
                  </Button>
                ) : (
                  <Button size="lg" variant="yellow" disabled>
                    {REG_STATUS_LABEL[regStatus] ?? regStatus}
                  </Button>
                )}
                <Button asChild size="lg" variant="primary">
                  <Link to="/player-info">个人中心</Link>
                </Button>
                {isAdmin && (
                  <Button asChild size="lg" variant="teal">
                    <Link to="/staff-dashboard">管理后台</Link>
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            {eventCards.map((c) => (
              <Link key={c.to} to={c.to} className={cardBase}>
                <c.Icon className="h-6 w-6 shrink-0" style={{ color: c.color }} />
                <span className="text-base font-bold text-(--pc-ink)">{c.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {community.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border-2 border-(--pc-border) bg-(--pc-white) px-3 py-1 text-xs font-bold text-(--pc-slate)"
              >
                {c.label}
              </a>
            ))}
          </div>

          <div className={cn(panelBase, "w-full")}>
            <p className="text-[10px] font-bold tracking-[0.18em] text-(--pc-faint) uppercase">
              Tools
            </p>
            <p className="mt-0.5 text-base font-black text-(--pc-ink)">项目与工具</p>
            <div className="mt-2 grid gap-1">
              {projectLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs transition hover:bg-pc-primary/10"
                >
                  <span>
                    <span className="block font-bold text-(--pc-ink)">{l.label}</span>
                    <span className="block text-[10px] text-(--pc-faint)">{l.desc}</span>
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-(--pc-faint)" />
                </Link>
              ))}
            </div>
          </div>

          <div className={cn(panelBase, "w-full")}>
            <p className="text-[10px] font-bold tracking-[0.18em] text-(--pc-faint) uppercase">
              News
            </p>
            <p className="mt-0.5 text-base font-black text-(--pc-ink)">最新资讯</p>
            <div className="mt-2 grid gap-2">
              {news.length > 0 ? (
                news.map((n) => (
                  <Link
                    key={n.slug}
                    to={`/news/${n.slug}`}
                    className="block rounded-lg px-2 py-2 hover:bg-pc-yellow/15"
                  >
                    <span className="block text-sm font-bold text-(--pc-ink)">
                      {n.title || "未命名资讯"}
                    </span>
                    {n.date && <span className="text-[10px] text-(--pc-faint)">{n.date}</span>}
                  </Link>
                ))
              ) : (
                <p className="px-2 py-2 text-xs text-(--pc-faint)">暂无资讯</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <RegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />

      {/* 全局表情选择器：选完贴到画布中央，再拖动/缩放/旋转 */}
      <EmojiPicker
        open={stickerPickerOpen}
        onOpenChange={setStickerPickerOpen}
        onPick={(token) => {
          void addBoardSticker(token);
        }}
      />
    </div>
  );
}
