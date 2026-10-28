import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SeasonOption } from "@/lib/seasons";

interface SeasonSelectProps {
  /** 当前值；空字符串表示“全部赛季” */
  value: string;
  onChange: (value: string) => void;
  options: SeasonOption[];
  /** 是否提供“全部赛季”选项（筛选场景用） */
  includeAll?: boolean;
  /** 空值时的占位文案 */
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** 赛季下拉：房间 / 对战 / 赛程统一用它，保证三处赛季口径一致 */
export default function SeasonSelect({
  value,
  onChange,
  options,
  includeAll = false,
  placeholder = "选择赛季",
  className,
  disabled,
}: SeasonSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("h-9 w-32", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">全部赛季</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
