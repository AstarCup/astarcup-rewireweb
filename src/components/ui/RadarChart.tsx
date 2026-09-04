import { cn } from "@/lib/utils";

export interface RadarSkill {
  label: string;
  value: number;
}

interface RadarChartProps {
  skills: RadarSkill[];
  size?: number;
  className?: string;
}

function polygonPoints(skills: RadarSkill[], radius: number) {
  const cx = 100;
  const cy = 100;
  return skills
    .map((s, i) => {
      const angle = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
      const r = radius * Math.min(Math.max(s.value / 10, 0), 1.2);
      return `${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`;
    })
    .join(" ");
}

export default function RadarChart({
  skills,
  size = 260,
  className,
}: RadarChartProps) {
  const radius = 78;
  const cx = 100;
  const cy = 100;
  const ringCount = 5;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("block", className)}
      role="img"
      aria-label="技能雷达图"
    >
      {/* 网格环 */}
      {Array.from({ length: ringCount }, (_, i) => {
        const r = (radius * (i + 1)) / ringCount;
        return (
          <polygon
            key={i}
            points={skills
              .map((_, j) => {
                const a = (Math.PI * 2 * j) / skills.length - Math.PI / 2;
                return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
              })
              .join(" ")}
            fill={i === 0 ? "rgba(0,0,0,0.03)" : "none"}
            stroke="#e0d8cc"
            strokeWidth="1"
          />
        );
      })}

      {/* 轴线 */}
      {skills.map((_, i) => {
        const a = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(a) * radius}
            y2={cy + Math.sin(a) * radius}
            stroke="#e0d8cc"
            strokeWidth="1"
          />
        );
      })}

      {/* 数据区域 */}
      <polygon
        points={polygonPoints(skills, radius)}
        fill="rgba(232,93,117,0.25)"
        stroke="#e85d75"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 顶点 */}
      {skills.map((s, i) => {
        const a = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
        const r = radius * Math.min(Math.max(s.value / 10, 0), 1.2);
        return (
          <circle
            key={i}
            cx={cx + Math.cos(a) * r}
            cy={cy + Math.sin(a) * r}
            r="3"
            fill="#e85d75"
          />
        );
      })}

      {/* 标签与数值 */}
      {skills.map((s, i) => {
        const a = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
        const lx = cx + Math.cos(a) * (radius + 20);
        const ly = cy + Math.sin(a) * (radius + 20);
        const tx = cx + Math.cos(a) * (radius * 0.82);
        const ty = cy + Math.sin(a) * (radius * 0.82);
        return (
          <g key={i}>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="700"
              fill="#2d2d2d"
            >
              {s.label}
            </text>
            <text
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="700"
              fill="#666666"
            >
              {s.value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
