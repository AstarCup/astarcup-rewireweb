import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl bg-white px-3 py-3 text-sm text-foreground " +
          "border-2 border-[#e0d8cc] transition-all duration-200 " +
          "focus:border-[#e85d75] focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,93,117,0.15)] " +
          "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };