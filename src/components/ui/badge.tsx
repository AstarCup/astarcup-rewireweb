import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-xl border-2 px-2.5 py-0.5 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "border-(--pc-border) bg-(--pc-white) text-(--pc-ink)",
        primary: "border-[#e85d75] bg-[#e85d75] text-[#fdf6ee]",
        teal: "border-[#5cb8a5] bg-[#5cb8a5] text-[#fdf6ee]",
        yellow: "border-[#f5c040] bg-[#f5c040] text-(--pc-ink)",
        blue: "border-[#6b7fb5] bg-[#6b7fb5] text-[#fdf6ee]",
        outline: "border-(--pc-border) bg-(--pc-white) text-(--pc-slate)",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };