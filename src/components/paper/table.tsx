import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Paper Craft 风格表格容器：横向滚动 + 纸片阴影 */
export function PaperTable({
  minWidth = 720,
  children,
  className,
}: {
  minWidth?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/** 表头（统一底色与描边） */
export function Thead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead className={cn("border-b-2 border-(--pc-border) bg-(--pc-paper)", className)}>
      {children}
    </thead>
  );
}

/** 表头单元格 */
export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("whitespace-nowrap px-4 py-3 font-bold text-(--pc-slate)", className)}>
      {children}
    </th>
  );
}

/** 表体单元格 */
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}
