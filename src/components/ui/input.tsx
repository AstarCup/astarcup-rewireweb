import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl bg-(--pc-white) px-3 py-3 text-sm text-foreground " +
            "border-2 border-(--pc-border) transition-all duration-200 " +
            "focus:border-pc-primary focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,93,117,0.15)] " +
            "focus:shadow-[inset_0_2px_0_rgba(0,0,0,0.03)] " +
            "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };