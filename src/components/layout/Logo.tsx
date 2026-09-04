import { cn } from "@/lib/utils";

/** Simple paper-craft brand logo. */
export default function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display font-bold tracking-tight text-[#2d2d2d]",
        className,
      )}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e85d75] text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.12)] rotate-[-2deg]">
        A
      </span>
      <span className="relative">
        astracup
        <span className="absolute -right-2 -top-1 h-2 w-2 rounded-sm bg-[#5cb8a5] rotate-[15deg]" />
      </span>
    </span>
  );
}