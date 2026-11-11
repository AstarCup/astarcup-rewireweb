import type { DisplayScore } from "@/lib/types";
import { fmt, fmtInt, osuAvatarUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function accPercent(acc: number): string {
  const v = acc > 1 ? acc : acc * 100;
  return `${fmt(v, 2)}%`;
}

function ScoreRow({ score }: { score: DisplayScore }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-3 py-2 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
      <img
        src={score.avatarUrl ?? osuAvatarUrl(score.userId) ?? undefined}
        alt=""
        className="h-8 w-8 rounded-full border-2 border-(--pc-border)"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-(--pc-ink)">{score.username}</div>
        <div className="text-xs text-(--pc-faint)">
          {accPercent(score.accuracy)} · x{fmtInt(score.maxCombo)} ·{" "}
          {score.statistics.count300}/{score.statistics.count100}/{score.statistics.count50}/
          {score.statistics.countMiss}
          {score.mods.length > 0 ? ` · ${score.mods.join(" ")}` : ""}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-bold text-(--pc-ink)">{fmtInt(score.totalScore)}</div>
        <Badge variant={score.passed ? "teal" : "primary"}>{score.rank || (score.passed ? "PASS" : "FAIL")}</Badge>
      </div>
    </div>
  );
}

interface ScoresPanelProps {
  matchType: "head_to_head" | "team_versus";
  /** 房间玩家 → 队伍（团队赛分栏用） */
  teams: Record<number, "red" | "blue" | "none">;
  scores: DisplayScore[] | null;
}

/** 中栏下半：比分（个人赛单列 / 团队赛红蓝两栏 + 队伍总分） */
export default function ScoresPanel({ matchType, teams, scores }: ScoresPanelProps) {
  const sorted = [...(scores ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || b.totalScore - a.totalScore,
  );
  const red = sorted.filter((s) => teams[s.userId] === "red");
  const blue = sorted.filter((s) => teams[s.userId] === "blue");
  // 团队赛里没分队的玩家不能算进蓝队（否则总分虚高）
  const unassigned = sorted.filter(
    (s) => teams[s.userId] !== "red" && teams[s.userId] !== "blue",
  );
  const sum = (arr: DisplayScore[]) => arr.reduce((acc, s) => acc + (s.totalScore || 0), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base md:text-lg">比分</CardTitle>
        <div className="flex items-center gap-2 text-xs text-(--pc-slate)">
          <span>比赛类型</span>
          <Badge variant="outline">{matchType === "head_to_head" ? "个人赛" : "团队赛"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!scores || scores.length === 0 ? (
          <p className="py-8 text-center text-sm text-(--pc-faint)">比赛结束后将在此显示比分</p>
        ) : matchType === "head_to_head" ? (
          <div className="flex flex-col gap-2">
            {sorted.map((s) => (
              <ScoreRow key={`${s.userId}-${s.playlistId ?? 0}`} score={s} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-pc-primary/40 bg-pc-primary/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-pc-primary">红队</span>
                  <span className="font-mono text-lg font-bold text-(--pc-ink)">{fmtInt(sum(red))}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {red.map((s) => (
                    <ScoreRow key={`${s.userId}-${s.playlistId ?? 0}`} score={s} />
                  ))}
                  {red.length === 0 && <p className="text-xs text-(--pc-faint)">暂无队员成绩</p>}
                </div>
              </div>
              <div className="rounded-xl border-2 border-pc-blue/40 bg-pc-blue/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-pc-blue">蓝队</span>
                  <span className="font-mono text-lg font-bold text-(--pc-ink)">{fmtInt(sum(blue))}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {blue.map((s) => (
                    <ScoreRow key={`${s.userId}-${s.playlistId ?? 0}`} score={s} />
                  ))}
                  {blue.length === 0 && <p className="text-xs text-(--pc-faint)">暂无队员成绩</p>}
                </div>
              </div>
            </div>
            {unassigned.length > 0 && (
              <div className="rounded-xl border-2 border-dashed border-(--pc-border) bg-(--pc-paper) p-3">
                <div className="mb-2 text-sm font-bold text-(--pc-slate)">
                  未分队 <span className="font-normal text-(--pc-faint)">（不计入队伍总分）</span>
                </div>
                <div className="flex flex-col gap-2">
                  {unassigned.map((s) => (
                    <ScoreRow key={`${s.userId}-${s.playlistId ?? 0}`} score={s} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
