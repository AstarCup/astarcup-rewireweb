import { useState } from "react";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";

/**
 * 赛季徽章：优先显示 /assets/badge/{season}.svg 图片；图片缺失时回退为原来的奖杯 Badge。
 * 悬停显示赛季名。
 */
export default function SeasonBadge({
  season,
  label,
}: {
  /** 赛季 key（如 "s1"），决定图片路径 */
  season: string;
  /** 显示文本（如 "S1"），回退 Badge 时使用 */
  label: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Badge variant="yellow">
        <Trophy className="h-3.5 w-3.5" />
        {label}
      </Badge>
    );
  }
  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <img
          src={`/assets/badge/${season.toLowerCase()}.svg`}
          alt={label}
          className="h-6 w-auto max-w-[140px] cursor-help object-contain"
          onError={() => setFailed(true)}
        />
      </HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-auto px-3 py-1">
        <span className="text-xs font-bold text-(--pc-ink)">{label}</span>
      </HoverCardContent>
    </HoverCard>
  );
}
