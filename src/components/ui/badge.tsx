import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-xl border-2 px-2.5 py-0.5 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "border-(--pc-border) bg-(--pc-white) text-(--pc-ink)",
        primary: "border-pc-primary bg-pc-primary text-pc-cream",
        teal: "border-pc-teal bg-pc-teal text-pc-cream",
        yellow: "border-pc-yellow bg-pc-yellow text-(--pc-ink)",
        blue: "border-pc-blue bg-pc-blue text-pc-cream",
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