import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";

/** 带标签的筛选下拉（Label + Select 组合），children 放 SelectItem */
export function FilterSelect({
  label,
  value,
  onValueChange,
  placeholder,
  className,
  children,
}: {
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <Label className="text-xs text-(--pc-faint)">{label}</Label>}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("w-36", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
