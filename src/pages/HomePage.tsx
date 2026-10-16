import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  Map,
  MessageCircle,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { site } from "@/lib/site";
import { osuAvatarUrl } from "@/lib/utils";
import { SectionTitle, PaperStack } from "@/components/paper/paper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseFrontMatter } from "@/lib/markdown";
import AnimatedLogo from "@/components/layout/AnimatedLogo";
import winners from "@/data/winners.json";
import RegisterDialog from "@/components/RegisterDialog";
import { REG_STATUS_LABEL } from "@/lib/types";
import { useState } from "react";

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
  photos: { id: string; imageUrl: string; caption: string }[];
}

const winnersData = winners as WinnersData;

const quickLinks = [
  { to: "/guide", label: "比赛手册", desc: "规则 · 分组 · 赛制详解", icon: BookOpen },
  { to: "/schedule", label: "赛程安排", desc: "对阵表 · 比分 · 回放", icon: CalendarDays },
  { to: "/mappool", label: "图池", desc: "选图 · 定制 · 难度", icon: Map },
  { to: "/contact", label: "联系我们", desc: "STAFF · 报名 · 疑问", icon: MessageCircle },
];

const projectLinks = [
  {
    label: "osu! Plus Plus",
    desc: "OPP工具箱",
    to: "/tools",
  },
  {
    label: "Ez2Lazer",
    desc: "支持asio、强化mania的第三方客户端",
    to: "/tools",
  },
  {
    label: "g0v0 lazer",
    desc: "咕服专用客户端，支持asio",
    to: "/tools",
  },
];

const newsModules = import.meta.glob("@/data/news/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const news = Object.entries(newsModules)
  .map(([path, raw]) => ({
    slug: path.split("/").pop()?.replace(/\.md$/, "") ?? "",
    data: parseFrontMatter(raw).data,
  }))
  .sort((a, b) => {
    const da = a.data.date ? new Date(a.data.date).getTime() : 0;
    const db = b.data.date ? new Date(b.data.date).getTime() : 0;
    return db - da;
  });

const medalColors = ["bg-pc-yellow", "bg-[#cfd3c9]", "bg-[#e0a47e]"];
const rankLabel = (rank: number) =>
  rank === 1 ? "Winner" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank} 名`;

export default function HomePage() {
  const { user, permissions } = useApp();

  const [registerOpen, setRegisterOpen] = useState(false);
  const isAdmin = !!permissions?.isadmin;

  const sortedWinners = [...winnersData.cards].sort((a, b) => a.rank - b.rank);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-4 md:px-8">
        <span
          aria-hidden
          className="absolute -left-8 top-4 h-28 w-28 rotate-[-8deg] rounded-3xl bg-pc-teal/30"
        />
        <span
          aria-hidden
          className="absolute right-10 top-20 h-16 w-16 rotate-12 rounded-2xl bg-pc-yellow/40"
        />
        <span
          aria-hidden
          className="absolute right-1/3 top-2 h-8 w-8 rotate-[30deg] rounded-lg bg-pc-primary/20"
        />
        <div className="relative mx-auto max-w-6xl">
            <div className="flex flex-col items-start gap-6">
              <AnimatedLogo />
              <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-2">
                {!user ? (
                  <Button asChild size="lg" variant="primary">
                    <Link to="/register">登录 / 报名</Link>
                  </Button>
                ) : (
                  <>
                    {(() => {
                      const regStatus = user.registrationStatus ?? "not_registered";
                      return regStatus === "not_registered" ? (
                        <Button size="lg" variant="yellow" onClick={() => setRegisterOpen(true)}>
                          快速报名
                        </Button>
                      ) : (
                        <Button size="lg" variant="yellow" disabled>
                          {REG_STATUS_LABEL[regStatus] ?? regStatus}
                        </Button>
                      );
                    })()}
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
            </div>
        </div>
      </section>

      {/* Project quick links */}
      <section className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {projectLinks.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="flex flex-col justify-end rounded-2xl border-2 border-(--pc-border) bg-(--pc-white) p-5 shadow-[3px_3px_0px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.1)]"
            >
              <p className="font-bold text-xl text-(--pc-ink)">{l.label}</p>
              <p className="mt-1 text-xs text-(--pc-faint)">{l.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Community links */}
      {user && (
        <section className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <a
              href={site.contact.qqGroup}
              target="_blank"
              rel="noreferrer"
              className="group relative flex flex-col justify-end rounded-2xl border-2 border-(--pc-border) bg-(--pc-white) p-5 shadow-[3px_3px_0px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.1)]"
            >
              <p className="font-bold text-xl text-(--pc-ink)">QQ Group</p>
              <img
                src="/QQGroupQRcode.png"
                alt="QQ 群二维码"
                className="absolute right-3 top-3 w-32 rounded-xl bg-(--pc-white) p-2 shadow-[3px_3px_0px_rgba(0,0,0,0.1)] opacity-0 transition group-hover:opacity-100"
              />
            </a>
            <a
              href={site.contact.bilibili}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col justify-end rounded-2xl border-2 border-(--pc-border) bg-(--pc-white) p-5 shadow-[3px_3px_0px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.1)]"
            >
              <p className="font-bold text-xl text-(--pc-ink)">Bilibili</p>
              <p className="mt-1 text-xs text-(--pc-faint)">比赛录像与精彩集锦</p>
            </a>
            <a
              href={site.contact.bilibiliLive}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col justify-end rounded-2xl border-2 border-(--pc-border) bg-(--pc-white) p-5 shadow-[3px_3px_0px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.1)]"
            >
              <p className="font-bold text-xl text-(--pc-ink)">Live</p>
              <p className="mt-1 text-xs text-(--pc-faint)">赛事直播频道</p>
            </a>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <SectionTitle tag="快速导航">赛事模块</SectionTitle>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item, i) => {
            const Icon = item.icon;
            const color = ["var(--pc-primary)", "var(--pc-teal)", "var(--pc-yellow)", "var(--pc-blue)"][i % 4];
            return (
              <Link key={item.to} to={item.to} className="block">
                <PaperStack className="h-full" layers={i % 2 === 0 ? 2 : 3}>
                  <div className="flex h-full flex-col gap-3 p-6">
                    <span
                      className="inline-flex h-12 w-12 rotate-[-2deg] items-center justify-center rounded-xl text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
                      style={{ backgroundColor: color }}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-bold text-lg text-(--pc-ink)">{item.label}</h3>
                      <p className="mt-1 text-xs text-(--pc-faint)">{item.desc}</p>
                    </div>
                  </div>
                </PaperStack>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Winners */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <SectionTitle tag="荣耀殿堂" accent="var(--pc-yellow)">
          历届冠军
        </SectionTitle>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedWinners.map((w, i) => {
            const medal = medalColors[Math.min(Math.max(w.rank - 1, 0), 2)] ?? "bg-pc-yellow";
            return (
              <PaperStack key={w.id} className="h-full" layers={w.rank % 2 === 0 ? 2 : 3}>
                <div
                  className={`flex h-full items-center gap-4 p-6 ${
                    i % 2 === 0 ? "-rotate-1" : "rotate-1"
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.1)] ${medal}`}
                  >
                    <img
                      src={w.avatarUrl || osuAvatarUrl(w.osuId)}
                      alt={w.playerName}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-(--pc-ink)">{w.playerName}</span>
                      <Badge variant="outline">{rankLabel(w.rank)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-(--pc-faint)">
                      {w.season?.toUpperCase() ?? "Season"}
                    </p>
                  </div>
                </div>
              </PaperStack>
            );
          })}
        </div>
      </section>

      {/* News */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <SectionTitle tag="最新资讯">News</SectionTitle>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {news.map((n, i) => (
            <Link key={n.slug} to={`/news/${n.slug}`} className="block">
              <PaperStack className="h-full" layers={i % 2 === 0 ? 2 : 3}>
                <div className="flex h-full flex-col gap-2 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-lg text-(--pc-ink)">
                      {n.data.title || "未命名资讯"}
                    </h3>
                    {n.data.date && (
                      <Badge variant="yellow" className="shrink-0">
                        {n.data.date}
                      </Badge>
                    )}
                  </div>
                  {n.data.description && (
                    <p className="text-xs leading-relaxed text-(--pc-slate)">
                      {n.data.description}
                    </p>
                  )}
                </div>
              </PaperStack>
            </Link>
          ))}
        </div>
      </section>

      <RegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />
    </div>
  );
}