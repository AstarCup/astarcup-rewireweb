import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold text-sm transition-all duration-200 " +
    "hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,0.06)] " +
    "disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]",
        secondary:
          "bg-(--pc-white) text-foreground border-2 border-pc-ink shadow-[3px_3px_0px_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]",
        teal:
          "bg-pc-teal text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]",
        yellow:
          "bg-pc-yellow text-(--pc-ink) shadow-[3px_3px_0px_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]",
        outline:
          "border-2 border-(--pc-border) bg-(--pc-white) text-foreground shadow-[2px_2px_0px_rgba(0,0,0,0.06)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.1)]",
        ghost:
          "text-foreground hover:bg-secondary/60 hover:-translate-y-0 active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[3px_3px_0px_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-3",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };