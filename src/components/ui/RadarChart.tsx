import { useId } from "react";
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

/** 计算某个轴顶点的位置：负值沿该轴反向绘制（绕中心旋转 180°） */
function vertexPos(s: RadarSkill, i: number, count: number, radius: number) {
  const base = (Math.PI * 2 * i) / count - Math.PI / 2;
  const negative = s.value < 0;
  const angle = negative ? base + Math.PI : base;
  const r = radius * (Math.abs(s.value) / 10);
  return { x: 100 + Math.cos(angle) * r, y: 100 + Math.sin(angle) * r, negative };
}

function polygonPoints(skills: RadarSkill[], radius: number) {
  return skills
    .map((s, i) => {
      const p = vertexPos(s, i, skills.length, radius);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");
}

export default function RadarChart({
  skills,
  size = 260,
  className,
}: RadarChartProps) {
  const gradId = useId();
  const radius = 78;
  const cx = 100;
  const cy = 100;
  const ringCount = 5;

  // 归一化：非数字 → 0，并夹到 [-10, 10]，避免 toFixed/NaN 崩溃或非法 points
  const safeSkills: RadarSkill[] = skills.map((s) => {
    const v = Number(s.value);
    return { label: s.label, value: Number.isFinite(v) ? Math.max(-10, Math.min(10, v)) : 0 };
  });

  if (safeSkills.length === 0) return null;

  return (
    <svg
      viewBox="-20 -20 240 240"
      width={size}
      height={size}
      className={cn("block", className)}
      role="img"
      aria-label="技能雷达图"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--pc-primary)" />
          <stop offset="100%" stopColor="var(--pc-blue)" />
        </linearGradient>
      </defs>

      {/* 网格环 */}
      {Array.from({ length: ringCount }, (_, i) => {
        const r = (radius * (i + 1)) / ringCount;
        return (
          <polygon
            key={i}
            points={safeSkills
              .map((_, j) => {
                const a = (Math.PI * 2 * j) / safeSkills.length - Math.PI / 2;
                return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
              })
              .join(" ")}
            fill={i === 0 ? "rgba(0,0,0,0.03)" : "none"}
            stroke="#e0d8cc"
            strokeOpacity="0.3"
            strokeWidth="1"
          />
        );
      })}

      {/* 轴线 */}
      {safeSkills.map((_, i) => {
        const a = (Math.PI * 2 * i) / safeSkills.length - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(a) * radius}
            y2={cy + Math.sin(a) * radius}
            stroke="#e0d8cc"
            strokeOpacity="0.2"
            strokeWidth="1"
          />
        );
      })}

      {/* 数据区域 */}
      <polygon
        points={polygonPoints(safeSkills, radius)}
        fill="rgba(232,93,117,0.25)"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 顶点：正值粉色，负值蓝色（反向绘制） */}
      {safeSkills.map((s, i) => {
        const p = vertexPos(s, i, safeSkills.length, radius);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={p.negative ? "var(--pc-blue)" : "var(--pc-primary)"}
          />
        );
      })}

      {/* 标签与数值（数值在标签下方，不画进雷达图内） */}
      {safeSkills.map((s, i) => {
        const a = (Math.PI * 2 * i) / safeSkills.length - Math.PI / 2;
        const lx = cx + Math.cos(a) * (radius + 20);
        const ly = cy + Math.sin(a) * (radius + 20);
        return (
          <g key={i}>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="700"
              fill="var(--pc-ink)"
            >
              {s.label}
            </text>
            <text
              x={lx}
              y={ly + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="700"
              fill="var(--pc-slate)"
            >
              {s.value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
