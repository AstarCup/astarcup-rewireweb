import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/paper/paper";
import { LoadingBlock, ErrorBlock, useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { MatchSchedule, MatchRoom } from "@/lib/types";

interface ScheduleGroup {
  key: string;
  label: string;
  matchDate: string | null;
  items: MatchSchedule[];
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="primary" className="border-[#e85d75] bg-[#e85d75]">
          待定
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="teal" className="border-[#5cb8a5] bg-[#5cb8a5]">
          已确认
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="yellow" className="border-[#f5c040] bg-[#f5c040] text-[#2d2d2d]">
          已完成
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="border-[#e85d75]/40 bg-white text-[#e85d75]">
          已取消
        </Badge>
      );
    default:
      return <Badge variant="outline">未知</Badge>;
  }
}

function groupSchedules(list: MatchSchedule[]): ScheduleGroup[] {
  const groups: ScheduleGroup[] = [];
  for (const item of list) {
    const room: MatchRoom | null = item.room ?? null;
    const idKey = room?.id != null ? String(room.id) : "未分组";
    const key = room?.roomName ?? idKey;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = {
        key,
        label: room?.roomName || idKey,
        matchDate: room?.matchDate ?? null,
        items: [],
      };
      groups.push(g);
    }
    g.items.push(item);
  }
  // Sort groups by match date, then by round/match number.
  groups.sort((a, b) => {
    const da = a.matchDate ? new Date(a.matchDate).getTime() : 0;
    const db = b.matchDate ? new Date(b.matchDate).getTime() : 0;
    if (da !== db) return da - db;
    return a.label.localeCompare(b.label, "zh-CN");
  });
  return groups;
}

function ScheduleItem({ item }: { item: MatchSchedule }) {
  const room = item.room ?? null;
  const score =
    item.redScore != null && item.blueScore != null
      ? `${item.redScore} : ${item.blueScore}`
      : null;

  const links: { label: string; href: string | null | undefined }[] = [
    { label: "比赛直播", href: item.matchLink },
    { label: "直播", href: item.streamLink },
    { label: "回放", href: item.replayLink },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.08)] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        {statusBadge(item.status)}
        {score != null && (
          <span className="rounded-xl bg-[#fdf6ee] border-2 border-[#e0d8cc] px-3 py-1 font-sans text-sm font-bold text-[#2d2d2d]">
            {score}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <span className="flex-1 truncate font-bold text-[#2d2d2d]">
          {item.player1Username ?? `#${item.player1OsuId ?? "-"}`}
        </span>
        <span className="font-sans text-sm font-bold text-[#b0a898]">VS</span>
        <span className="flex-1 truncate text-right font-bold text-[#2d2d2d]">
          {item.player2Username ?? `#${item.player2OsuId ?? "-"}`}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#666666]">
        {room?.roundNumber != null && room.roundNumber > 0 && (
          <span className="rounded-lg bg-[#6b7fb5]/10 px-2 py-0.5 font-bold text-[#6b7fb5]">
            R{room.roundNumber}
          </span>
        )}
        {room?.matchNumber != null && room.matchNumber > 0 && (
          <span className="rounded-lg bg-[#f5c040]/15 px-2 py-0.5 font-bold text-[#2d2d2d]">
            第 {room.matchNumber} 场
          </span>
        )}
        <span>{formatDateTime(room?.matchDate)}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {links.some((l) => l.href) ? (
          links
            .filter((l) => l.href)
            .map((l) => (
              <a
                key={l.label}
                href={l.href as string}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl border-2 border-[#e0d8cc] bg-white px-3 py-1.5 text-xs font-bold text-[#2d2d2d] shadow-[2px_2px_0px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:text-[#e85d75]"
              >
                {l.label}
              </a>
            ))
        ) : (
          <span className="text-xs text-[#b0a898]">暂无链接</span>
        )}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { data, loading, error, load } = useFetch<MatchSchedule[]>(() =>
    api.get<MatchSchedule[]>("/api/schedules"),
  );

  const groups = groupSchedules(data ?? []);

  return (
    <div className="bg-[#fdf6ee]">
      <PageHeader title="赛程安排" subtitle="比赛对阵与每场直播、回放信息一览" />

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {loading && <LoadingBlock label="正在加载赛程…" />}
        {error && <ErrorBlock message={error} onRetry={() => void load()} />}

        {!loading && !error && groups.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-[#b0a898]">暂无赛程</p>
          </div>
        )}

        {!loading && !error && groups.length > 0 && (
          <div className="flex flex-col gap-8">
            {groups.map((g) => (
              <section key={g.key}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-block rounded-xl bg-[#5cb8a5] px-3 py-1 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)]">
                    {g.label}
                  </span>
                  {g.matchDate && (
                    <span className="text-xs text-[#666666]">{formatDateTime(g.matchDate)}</span>
                  )}
                  <span className="ml-auto rounded-full bg-[#fdf6ee] border border-[#e0d8cc] px-2 py-0.5 text-xs text-[#b0a898]">
                    {g.items.length} 场
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {g.items.map((item) => (
                    <ScheduleItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}