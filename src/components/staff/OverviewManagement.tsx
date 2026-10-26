import { useFetch, LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { SectionTitle } from "@/components/paper/paper";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fmt, fmtInt } from "@/lib/utils";
import { seasonLabel } from "@/lib/types";
import type { StaffStats, SeasonPlayerStat } from "@/lib/types";

const SEASON_METRICS: {
  key: keyof SeasonPlayerStat;
  label: string;
  accent: string;
}[] = [
  { key: "totalRegistrations", label: "总报名", accent: "#e85d75" },
  { key: "approvedPlayers", label: "已过审选手", accent: "#5cb8a5" },
  { key: "unapprovedPlayers", label: "没过审选手", accent: "#f5c040" },
  { key: "replayCount", label: "回放数", accent: "#6b7fb5" },
];

export default function OverviewManagement() {
  const { user, permissions, settings } = useApp();
  const { data, loading, error, load } = useFetch<StaffStats>(() => api.get("/api/staff/stats"));

  if (loading) return <LoadingBlock label="加载统计中…" />;
  if (error || !data) return <ErrorBlock message={error || "没有数据"} onRetry={load} />;

  const stats = data;
  const seasonKeys = Object.keys(stats.seasonStats ?? {}).sort();
  const ts = stats.tournamentSettings;

  return (
    <div>
      {/* Welcome banner */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-(--pc-white) p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
        <Avatar className="h-16 w-16 rounded-2xl border-2 border-[#e85d75]">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.username ?? ""} />
          <AvatarFallback className="bg-[#f5c040]/30 text-xl font-bold text-(--pc-ink)">
            {user?.username?.slice(0, 1).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-xl text-(--pc-ink)">欢迎回来，{user?.username ?? "Staff"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {permissions?.isadmin && <Badge variant="primary">管理员</Badge>}
            {permissions?.isplayer && <Badge variant="teal">选手</Badge>}
          </div>
        </div>
      </div>

      <SectionTitle tag="后台概览" accent="#e85d75">
        运营数据一览
      </SectionTitle>

      {/* 赛事设置（顶部卡片） */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <CardTitle className="mb-4">赛事设置</CardTitle>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            <div>
              <CardDescription>当前赛季</CardDescription>
              <p className="mt-1 text-lg font-bold text-(--pc-ink)">
                {seasonLabel(settings, ts.currentSeason) || "-"}
              </p>
            </div>
            <div>
              <CardDescription>当前阶段</CardDescription>
              <p className="mt-1 text-lg font-bold text-(--pc-ink)">
                {ts.currentSeasonStage || "-"}
              </p>
            </div>
            <div>
              <CardDescription>PP 门槛</CardDescription>
              <p className="mt-1 text-lg font-bold text-(--pc-ink)">
                {fmt(ts.minPp)} ~ {fmt(ts.maxPp)}
              </p>
            </div>
            <div>
              <CardDescription>管理员数量</CardDescription>
              <p className="mt-1 text-lg font-bold text-(--pc-ink)">
                {fmtInt(ts.adminCount)}
              </p>
            </div>
            <div>
              <CardDescription>报名开放</CardDescription>
              <div className="mt-1">
                <Badge variant={ts.registrationEnabled ? "teal" : "outline"}>
                  {ts.registrationEnabled ? "开放" : "关闭"}
                </Badge>
              </div>
            </div>
            <div>
              <CardDescription>图池可见</CardDescription>
              <div className="mt-1">
                <Badge variant={ts.mappoolVisible ? "blue" : "outline"}>
                  {ts.mappoolVisible ? "可见" : "隐藏"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分赛季数据板块 */}
      <SectionTitle tag="赛季数据" accent="#5cb8a5" className="mt-10">
        按赛季查看报名 / 图池 / 回放统计
      </SectionTitle>

      {seasonKeys.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-(--pc-faint)">暂无赛季数据</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {seasonKeys.map((season) => {
            const player = stats.seasonStats?.[season] ?? {
              totalRegistrations: 0,
              approvedPlayers: 0,
              unapprovedPlayers: 0,
              replayCount: 0,
            };
            const stageRows = stats.seasonMappoolStats?.[season] ?? [];
            const totalMappool = stageRows.reduce(
              (acc, r) => acc + r.count + r.testingCount + r.pendingCount,
              0,
            );
            return (
              <Card key={season}>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Badge variant="primary" className="text-sm">
                      {seasonLabel(settings, season) || season}
                    </Badge>
                    <span className="text-xs text-(--pc-faint)">{season}</span>
                  </div>

                  {/* 报名 / 回放 指标 */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {SEASON_METRICS.map((m) => (
                      <div
                        key={m.key}
                        className="relative overflow-hidden rounded-xl bg-(--pc-paper) p-4"
                      >
                        <span
                          aria-hidden
                          className="absolute left-0 top-0 h-1 w-full"
                          style={{ backgroundColor: m.accent }}
                        />
                        <p className="text-xs font-bold text-(--pc-slate)">{m.label}</p>
                        <p className="mt-2 text-2xl font-bold text-(--pc-ink)">
                          {fmtInt(player[m.key])}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 总图池数 + 阶段细分 */}
                  <div className="mt-3 rounded-xl bg-(--pc-paper) p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-(--pc-slate)">总图池数</p>
                      <p className="text-lg font-bold text-(--pc-ink)">{fmtInt(totalMappool)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stageRows.length > 0 ? (
                        stageRows.map((r) => (
                          <Badge key={r.category} variant="outline">
                            {r.label} {fmtInt(r.count + r.testingCount + r.pendingCount)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-(--pc-faint)">暂无图池</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
