import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/paper/paper";
import { LoadingBlock, ErrorBlock, useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { osuAvatarUrl } from "@/lib/utils";
import type { MatchSchedule } from "@/lib/types";

interface ScheduleRow {
  item: MatchSchedule;
  roomName: string;
  timeText: string;
  scoreText: string | null;
  links: { label: string; href: string }[];
  winner: 1 | 2 | null;
}

/** 后端把本地墙钟时间按 UTC 序列化（+00:00），这里直接取墙钟部分显示，不做时区换算 */
function wallClock(iso?: string | null): string {
  if (!iso) return "-";
  const naive = iso.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const [datePart, timePart = ""] = naive.split("T");
  return timePart ? `${datePart} ${timePart.slice(0, 5)}` : datePart;
}

/** 赛程所属赛季：自身没标时跟随房间 */
const seasonOf = (s: MatchSchedule) => (s.season ?? s.room?.season ?? "").toLowerCase();

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="primary" className="border-pc-primary bg-pc-primary">
          待定
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="teal" className="border-pc-teal bg-pc-teal">
          已确认
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="yellow" className="border-pc-yellow bg-pc-yellow text-(--pc-ink)">
          已完成
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="border-pc-primary/40 bg-(--pc-white) text-pc-primary">
          已取消
        </Badge>
      );
    default:
      return <Badge variant="outline">未知</Badge>;
  }
}

/** 胜者标记 */
function WinTag() {
  return (
    <span className="rounded bg-pc-teal px-1 py-0.5 text-[10px] font-bold leading-none text-pc-cream">
      WIN
    </span>
  );
}

function toRow(item: MatchSchedule): ScheduleRow {
  const room = item.room ?? null;
  const red = item.redScore;
  const blue = item.blueScore;
  const hasScore = red != null && blue != null;
  const links = [
    { label: "room link", href: item.matchLink ?? "" },
    { label: "直播", href: item.streamLink ?? "" },
    { label: "回放", href: item.replayLink ?? "" },
  ].filter((l) => l.href);

  return {
    item,
    roomName: room?.roomName || "未分配房间",
    timeText: wallClock(room?.matchTime ?? room?.matchDate),
    scoreText: hasScore ? `${red} : ${blue}` : null,
    links,
    winner: hasScore ? (red > blue ? 1 : blue > red ? 2 : null) : null,
  };
}

export default function SchedulePage() {
  const { data, loading, error, load } = useFetch<MatchSchedule[]>(() =>
    api.get<MatchSchedule[]>("/api/schedules"),
  );
  // null = 还没手动选过，默认跟随「最新赛季」
  const [season, setSeason] = useState<string | null>(null);

  const all = data ?? [];
  const seasons = useMemo(() => {
    const set = new Set<string>();
    for (const s of all) {
      const se = seasonOf(s);
      if (se) set.add(se);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [all]);

  const activeSeason = season ?? (seasons[seasons.length - 1] ?? "all");

  const rows = useMemo(() => {
    const visible = activeSeason === "all" ? all : all.filter((s) => seasonOf(s) === activeSeason);
    return [...visible]
      // 时间倒序：晚的在前、早的在后
      .sort((a, b) => (b.room?.matchTime ?? "").localeCompare(a.room?.matchTime ?? ""))
      .map(toRow);
  }, [all, activeSeason]);

  return (
    <div className="bg-(--pc-paper)">
      <PageHeader title="赛程安排" subtitle="比赛对阵与每场直播、回放信息一览" />

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {loading && <LoadingBlock label="正在加载赛程…" />}
        {error && <ErrorBlock message={error} onRetry={() => void load()} />}

        {!loading && !error && seasons.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={activeSeason === "all" ? "primary" : "outline"}
              onClick={() => setSeason("all")}
            >
              全部
            </Button>
            {seasons.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={activeSeason === s ? "primary" : "outline"}
                onClick={() => setSeason(s)}
              >
                {s.toUpperCase()}
              </Button>
            ))}
            <span className="ml-auto text-xs text-(--pc-faint)">共 {rows.length} 场</span>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="rounded-2xl bg-(--pc-white) p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-(--pc-faint)">暂无赛程</p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-(--pc-border) text-xs text-(--pc-faint)">
                  <th className="whitespace-nowrap px-4 py-3 font-bold">时间</th>
                  <th className="px-4 py-3 font-bold">房间</th>
                  <th className="px-4 py-3 text-center font-bold">对阵</th>
                  <th className="whitespace-nowrap px-4 py-3 font-bold">链接</th>
                  <th className="whitespace-nowrap px-4 py-3 font-bold">状态</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, roomName, timeText, scoreText, links, winner }) => (
                  <tr
                    key={item.id}
                    className="border-b border-(--pc-border)/60 last:border-0 hover:bg-(--pc-paper)"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-sans text-(--pc-slate)">
                      {timeText}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-(--pc-ink)">{roomName}</p>
                      {item.season && (
                        <p className="mt-0.5 text-xs text-(--pc-faint)">
                          {item.season.toUpperCase()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <img
                          src={osuAvatarUrl(item.player1OsuId)}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                        />
                        <span className="font-bold text-pc-primary">
                          {item.player1Username ?? `#${item.player1OsuId ?? "-"}`}
                        </span>
                        {winner === 1 && <WinTag />}
                        <span className="whitespace-nowrap px-1 font-sans text-sm font-bold text-(--pc-ink)">
                          {scoreText ?? "vs"}
                        </span>
                        {winner === 2 && <WinTag />}
                        <span className="font-bold text-pc-blue">
                          {item.player2Username ?? `#${item.player2OsuId ?? "-"}`}
                        </span>
                        <img
                          src={osuAvatarUrl(item.player2OsuId)}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {links.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {links.map((l) => (
                            <a
                              key={l.label}
                              href={l.href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-pc-primary underline underline-offset-2 hover:no-underline"
                            >
                              {l.label}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-(--pc-faint)">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{statusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
