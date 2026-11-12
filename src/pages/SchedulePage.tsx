import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/paper/paper";
import { LoadingBlock, ErrorBlock, useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { cn, osuAvatarUrl } from "@/lib/utils";
import { stageLabelOf } from "@/lib/rooms";
import type { MatchSchedule } from "@/lib/types";

interface ScheduleRow {
  item: MatchSchedule;
  timeText: string;
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
    timeText: wallClock(room?.matchTime ?? room?.matchDate),
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
          <div className="overflow-hidden rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            {rows.map(({ item, timeText, links, winner }, index) => {
              const stage = item.room ? stageLabelOf(item.room) : "—";
              const season = seasonOf(item).toUpperCase();
              const hasScore = item.redScore != null && item.blueScore != null;
              return (
                <article
                  key={item.id}
                  className={cn(
                    "grid gap-6 px-6 py-7 md:grid-cols-[150px_minmax(0,1fr)] md:items-center",
                    index > 0 && "border-t border-(--pc-border)/50",
                  )}
                >
                  {/* 左：赛季 / 阶段 / 时间 / 状态 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-(--pc-faint)">
                      {season || "—"}
                    </span>
                    <span className="font-display text-4xl font-black leading-none text-(--pc-ink)">
                      {stage}
                    </span>
                    <span className="font-sans text-sm text-(--pc-slate)">{timeText}</span>
                    <div className="w-fit">{statusBadge(item.status)}</div>
                  </div>

                  {/* 右：对阵 + 链接 */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-center gap-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={osuAvatarUrl(item.player1OsuId)}
                          alt=""
                          className="h-14 w-14 rounded-full border-2 border-(--pc-border) object-cover"
                        />
                        <div className="flex flex-col items-start">
                          {winner === 1 && (
                            <span className="text-xs font-black tracking-wide text-pc-yellow">
                              WIN
                            </span>
                          )}
                          <span className="text-lg font-bold leading-tight text-pc-primary">
                            {item.player1Username ?? `#${item.player1OsuId ?? "-"}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {hasScore ? (
                          <>
                            <span className="font-display text-5xl font-black leading-none text-pc-primary">
                              {item.redScore}
                            </span>
                            <span className="text-sm font-bold text-(--pc-faint)">vs</span>
                            <span className="font-display text-5xl font-black leading-none text-pc-blue">
                              {item.blueScore}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-(--pc-faint)">vs</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          {winner === 2 && (
                            <span className="text-xs font-black tracking-wide text-pc-yellow">
                              WIN
                            </span>
                          )}
                          <span className="text-lg font-bold leading-tight text-pc-blue">
                            {item.player2Username ?? `#${item.player2OsuId ?? "-"}`}
                          </span>
                        </div>
                        <img
                          src={osuAvatarUrl(item.player2OsuId)}
                          alt=""
                          className="h-14 w-14 rounded-full border-2 border-(--pc-border) object-cover"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-4">
                      {links.length > 0 ? (
                        links.map((l) => (
                          <a
                            key={l.label}
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-(--pc-slate) underline underline-offset-4 transition-colors hover:text-pc-primary"
                          >
                            {l.label}
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-(--pc-faint)">—</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
