import { cn } from "@/lib/utils";

export default function Logo({ className, full }: { className?: string; full?: boolean }) {
  return (
    <img
      src={full ? "/NewLogo/newLogo.svg" : "/NewLogo/newSmLogo.svg"}
      alt="astracup"
      className={cn(full ? "h-12 w-auto" : "h-9 w-9", className)}
    />
  );
}
