import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-xl border-2 px-2.5 py-0.5 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "border-[#e0d8cc] bg-white text-[#2d2d2d]",
        primary: "border-[#e85d75] bg-[#e85d75] text-[#fdf6ee]",
        teal: "border-[#5cb8a5] bg-[#5cb8a5] text-[#fdf6ee]",
        yellow: "border-[#f5c040] bg-[#f5c040] text-[#2d2d2d]",
        blue: "border-[#6b7fb5] bg-[#6b7fb5] text-[#fdf6ee]",
        outline: "border-[#e0d8cc] bg-white text-[#666666]",
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