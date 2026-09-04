import { useState } from "react";
import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { SectionTitle } from "@/components/paper/paper";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fmt, fmtInt } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { seasonLabel } from "@/lib/types";
import type { StaffStats, SeasonMappoolStat } from "@/lib/types";

const STAT_CARDS: {
  key: "approvedPlayers" | "matchRooms" | "mappoolSeasons" | "replayCount" | "totalRegistrations" | "totalSchedules";
  label: string;
  accent: string;
}[] = [
  { key: "approvedPlayers", label: "已过审选手", accent: "bg-[#e85d75]" },
  { key: "matchRooms", label: "比赛房间", accent: "bg-[#5cb8a5]" },
  { key: "mappoolSeasons", label: "图池赛季", accent: "bg-[#f5c040]" },
  { key: "replayCount", label: "回放数量", accent: "bg-[#6b7fb5]" },
  { key: "totalRegistrations", label: "总报名数", accent: "bg-[#e85d75]" },
  { key: "totalSchedules", label: "总赛程", accent: "bg-[#5cb8a5]" },
];

const AVG_ROWS: { label: string; pick: (s: SeasonMappoolStat) => number }[] = [
  { label: "平均星数", pick: (s) => s.avgStarRating },
  { label: "平均星数(testing)", pick: (s) => s.avgStarRatingTesting },
  { label: "平均星数(pending)", pick: (s) => s.avgStarRatingPending },
  { label: "平均长度", pick: (s) => s.avgLength },
  { label: "平均长度(testing)", pick: (s) => s.avgLengthTesting },
  { label: "平均长度(pending)", pick: (s) => s.avgLengthPending },
];

export default function OverviewManagement() {
  const { user, permissions, settings } = useApp();
  const { data, loading, error, load } = useFetch<StaffStats>(() => api.get("/api/staff/stats"));
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return <LoadingBlock label="加载统计中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  const stats = data;
  const seasons = stats.seasonMappoolStats ?? {};
  const seasonKeys = Object.keys(seasons);

  return (
    <div>
      {/* Welcome banner */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
        <Avatar className="h-16 w-16 rounded-2xl border-2 border-[#e85d75]">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.username ?? ""} />
          <AvatarFallback className="bg-[#f5c040]/30 text-xl font-bold text-[#2d2d2d]">
            {user?.username?.slice(0, 1).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-xl text-[#2d2d2d]">欢迎回来，{user?.username ?? "Staff"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {permissions?.isadmin && <Badge variant="primary">管理员</Badge>}
            {permissions?.isplayer && <Badge variant="teal">选手</Badge>}
          </div>
        </div>
      </div>

      <SectionTitle tag="后台概览" accent="#e85d75">
        运营数据一览
      </SectionTitle>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map((c) => (
          <Card key={c.key} className="relative overflow-hidden p-4">
            <span aria-hidden className={cn("absolute left-0 top-0 h-1 w-full", c.accent)} />
            <p className="text-xs font-bold text-[#666666]">{c.label}</p>
            <p className="mt-2 text-3xl font-bold text-[#2d2d2d]">
              {fmtInt(stats[c.key])}
            </p>
          </Card>
        ))}
      </div>

      {/* Tournament settings */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <CardTitle className="mb-4">赛事设置</CardTitle>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            <div>
              <CardDescription>当前赛季</CardDescription>
              <p className="mt-1 text-lg font-bold text-[#2d2d2d]">
                {seasonLabel(settings, stats.tournamentSettings.currentSeason) || "-"}
              </p>
            </div>
            <div>
              <CardDescription>当前阶段</CardDescription>
              <p className="mt-1 text-lg font-bold text-[#2d2d2d]">
                {stats.tournamentSettings.currentSeasonStage || "-"}
              </p>
            </div>
            <div>
              <CardDescription>PP 门槛</CardDescription>
              <p className="mt-1 text-lg font-bold text-[#2d2d2d]">
                {fmt(stats.tournamentSettings.minPp)} ~ {fmt(stats.tournamentSettings.maxPp)}
              </p>
            </div>
            <div>
              <CardDescription>管理员数量</CardDescription>
              <p className="mt-1 text-lg font-bold text-[#2d2d2d]">
                {fmtInt(stats.tournamentSettings.adminCount)}
              </p>
            </div>
            <div>
              <CardDescription>报名开放</CardDescription>
              <p className="mt-1">
                <Badge variant={stats.tournamentSettings.registrationEnabled ? "teal" : "outline"}>
                  {stats.tournamentSettings.registrationEnabled ? "开放" : "关闭"}
                </Badge>
              </p>
            </div>
            <div>
              <CardDescription>图池可见</CardDescription>
              <p className="mt-1">
                <Badge
                  variant={
                    stats.tournamentSettings.registrationEnabled ? "blue" : "outline"
                  }
                >
                  {stats.tournamentSettings.mappoolVisible ? "可见" : "隐藏"}
                </Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-season mappool stats */}
      {seasonKeys.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <CardTitle className="mb-4">赛季图池阶段统计</CardTitle>
            {seasonKeys.map((season) => {
              const open = expanded === season;
              const rows = seasons[season];
              return (
                <div key={season} className="mb-3 rounded-xl border-2 border-[#e0d8cc] p-4">
                  <button
                    onClick={() => setExpanded(open ? null : season)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="font-bold text-[#2d2d2d]">{season}</span>
                    <span className="text-sm text-[#b0a898]">
                      {open ? "收起 ▲" : "展开 ▼"}
                    </span>
                  </button>
                  {open && (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {rows.map((row) => (
                        <div
                          key={row.category}
                          className="rounded-xl bg-[#fdf6ee] p-4"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-bold text-[#2d2d2d]">{row.label}</span>
                            <span className="flex gap-2">
                              <Badge variant="primary">{fmtInt(row.count)} 张</Badge>
                              <Badge variant="yellow">T {fmtInt(row.testingCount)}</Badge>
                              <Badge variant="blue">P {fmtInt(row.pendingCount)}</Badge>
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-[#666666]">
                            {AVG_ROWS.map((r) => (
                              <div
                                key={r.label}
                                className="flex items-center justify-between"
                              >
                                <span>{r.label}</span>
                                <span className="font-bold text-[#2d2d2d]">
                                  {fmt(r.pick(row))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}