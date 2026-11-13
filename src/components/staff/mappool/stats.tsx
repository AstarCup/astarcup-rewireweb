import { Badge } from "@/components/ui/badge";
import { MOD_COLORS, MOD_DISPLAY } from "@/lib/mods";
import { fmt, fmtInt } from "@/lib/utils";
import type { MapSelection, SeasonMappoolStat } from "@/lib/types";

/** 单个 MOD 分组（如 NM）的统计：数量、各属性平均值、测图与待审分解 */
export function groupStats(items: MapSelection[]) {
  const avgOn = (
    list: MapSelection[],
    f: (m: MapSelection) => number | null | undefined,
  ): number => {
    const vals = list.map(f).filter((v): v is number => v != null);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avg = (f: (m: MapSelection) => number | null | undefined) => avgOn(items, f);
  const round = (n: number) => Math.round(n);
  const testing = items.filter((m) => m.padding);
  const pending = items.filter((m) => !m.approved && !m.padding);
  return {
    count: items.length,
    testing: testing.length,
    pending: pending.length,
    avgStar: avg((m) => m.starRating),
    avgStarTesting: avgOn(testing, (m) => m.starRating),
    avgStarPending: avgOn(pending, (m) => m.starRating),
    avgLen: round(avg((m) => m.totalLength)),
    avgLenTesting: round(avgOn(testing, (m) => m.totalLength)),
    avgLenPending: round(avgOn(pending, (m) => m.totalLength)),
    avgAr: avg((m) => m.ar),
    avgCs: avg((m) => m.cs),
    avgOd: avg((m) => m.od),
    avgHp: avg((m) => m.hp),
    avgBpm: avg((m) => m.bpm),
    avgMaxCombo: round(avg((m) => m.maxCombo)),
  };
}

/** 单个 MOD 分组（如 NM）的完整统计卡片（HoverCard 用）：按图状态拆成 已审核 / 测图中 / 待审 三张横向排列 */
export function ModStatCard({ mod, items }: { mod: string; items: MapSelection[] }) {
  const toSub = (list: MapSelection[], title: string, accent: string) => {
    const g = groupStats(list);
    return {
      id: title,
      title,
      accent,
      count: list.length,
      star: g.avgStar,
      ar: g.avgAr,
      cs: g.avgCs,
      od: g.avgOd,
      hp: g.avgHp,
      bpm: g.avgBpm,
      length: g.avgLen,
      maxCombo: g.avgMaxCombo,
    };
  };
  const subs = [
    toSub(
      items.filter((m) => m.approved),
      "已审核",
      "var(--pc-teal)",
    ),
    toSub(
      items.filter((m) => m.padding),
      "测图中",
      "var(--pc-yellow)",
    ),
    toSub(
      items.filter((m) => !m.approved && !m.padding),
      "待审",
      "var(--pc-blue)",
    ),
  ];
  const s = groupStats(items);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span
          className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: MOD_COLORS[mod] ?? "#666" }}
        >
          {MOD_DISPLAY[mod] ?? mod}
        </span>
        <span className="flex gap-2">
          <Badge variant="primary">{fmtInt(s.count)} 张</Badge>
          <Badge variant="yellow">T {fmtInt(s.testing)}</Badge>
          <Badge variant="blue">P {fmtInt(s.pending)}</Badge>
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subs.map((sub) => (
          <StatSubCard key={sub.id} {...sub} />
        ))}
      </div>
    </div>
  );
}

/** 单个状态（已审核 / 测图中 / 待审）的统计子卡片 */
function StatSubCard({
  title,
  accent,
  count,
  star,
  ar,
  cs,
  od,
  hp,
  bpm,
  length,
  maxCombo,
}: {
  title: string;
  accent: string;
  count: number;
  star: number;
  ar: number;
  cs: number;
  od: number;
  hp: number;
  bpm: number;
  length: number;
  maxCombo: number;
}) {
  const rows: { label: string; value: number }[] = [
    { label: "平均星数", value: star },
    { label: "平均 AR", value: ar },
    { label: "平均 CS", value: cs },
    { label: "平均 OD", value: od },
    { label: "平均 HP", value: hp },
    { label: "平均 BPM", value: bpm },
    { label: "平均长度", value: length },
    { label: "平均 MaxCombo", value: maxCombo },
  ];
  return (
    <div className="min-w-48 flex-1 rounded-xl bg-(--pc-paper) p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-bold text-(--pc-ink)" style={{ color: accent }}>
          {title}
        </span>
        <Badge variant="outline">{fmtInt(count)} 张</Badge>
      </div>
      <div className="space-y-1 text-xs text-(--pc-slate)">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <span>{r.label}</span>
            <span className="font-bold text-(--pc-ink)">{fmt(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 单个阶段（如 QUA）的图池统计卡片：按图状态拆成 已审核 / 测图中 / 待审 三张 */
export function StageStatCard({ row }: { row: SeasonMappoolStat }) {
  const subs: {
    id: string;
    title: string;
    accent: string;
    count: number;
    star: number;
    ar: number;
    cs: number;
    od: number;
    hp: number;
    bpm: number;
    length: number;
    maxCombo: number;
  }[] = [
    {
      id: "approved",
      title: "已审核",
      accent: "var(--pc-teal)",
      count: row.count,
      star: row.avgStarRating,
      ar: row.avgAr,
      cs: row.avgCs,
      od: row.avgOd,
      hp: row.avgHp,
      bpm: row.avgBpm,
      length: row.avgLength,
      maxCombo: row.avgMaxCombo,
    },
    {
      id: "testing",
      title: "测图中",
      accent: "var(--pc-yellow)",
      count: row.testingCount,
      star: row.avgStarRatingTesting,
      ar: row.avgArTesting,
      cs: row.avgCsTesting,
      od: row.avgOdTesting,
      hp: row.avgHpTesting,
      bpm: row.avgBpmTesting,
      length: row.avgLengthTesting,
      maxCombo: row.avgMaxComboTesting,
    },
    {
      id: "pending",
      title: "待审",
      accent: "var(--pc-blue)",
      count: row.pendingCount,
      star: row.avgStarRatingPending,
      ar: row.avgArPending,
      cs: row.avgCsPending,
      od: row.avgOdPending,
      hp: row.avgHpPending,
      bpm: row.avgBpmPending,
      length: row.avgLengthPending,
      maxCombo: row.avgMaxComboPending,
    },
  ];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-(--pc-ink)">{row.label}</span>
        <span className="flex gap-2">
          <Badge variant="primary">{fmtInt(row.count)} 张</Badge>
          <Badge variant="yellow">T {fmtInt(row.testingCount)}</Badge>
          <Badge variant="blue">P {fmtInt(row.pendingCount)}</Badge>
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subs.map((s) => (
          <StatSubCard key={s.id} {...s} />
        ))}
      </div>
    </div>
  );
}

export const STAT_FIELDS: { key: string; label: string }[] = [
  { key: "star", label: "星数 ★" },
  { key: "ar", label: "AR" },
  { key: "cs", label: "CS" },
  { key: "od", label: "OD" },
  { key: "hp", label: "HP" },
  { key: "bpm", label: "BPM" },
  { key: "length", label: "时长 (s)" },
  { key: "maxCombo", label: "MaxCombo" },
];
