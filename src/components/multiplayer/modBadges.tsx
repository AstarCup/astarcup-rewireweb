import { cn } from "@/lib/utils";

/** Craft colour palette used to tag mods (Paper Craft). */
const MOD_COLORS: Record<string, string> = {
  NM: "#5cb8a5",
  HD: "#6b7fb5",
  HR: "#e85d75",
  DT: "#f5c040",
  NC: "#f5c040",
  EZ: "#5cb8a5",
  HT: "#f5c040",
  FL: "#6b7fb5",
  SO: "#5cb8a5",
  FM: "#6b7fb5",
  TB: "#e85d75",
  LZ: "#5cb8a5",
};

const PALETTE = ["#e85d75", "#5cb8a5", "#6b7fb5", "#f5c040"];

function colorFor(mod: string): string {
  return PALETTE[mod.charCodeAt(0) % PALETTE.length];
}

/** e.g. ["HD","HR"] -> "HD+HR", empty -> "NM". */
export function modsLabel(mods: string[]): string {
  return mods.length ? mods.join("+") : "NM";
}

/** Single MOD pill (`HD`) with a Paper Craft craft colour. */
export function ModBadge({ mod }: { mod: string }) {
  const color = MOD_COLORS[mod] ?? colorFor(mod);
  const isYellow = color === "#f5c040";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold shadow-[1.5px_1.5px_0px_rgba(0,0,0,0.08)]",
        isYellow ? "text-[#2d2d2d]" : "text-[#fdf6ee]",
      )}
      style={{ backgroundColor: color }}
    >
      {mod}
    </span>
  );
}

/** Renders a mod list (["HD","HR"]) as a row of craft-coloured badges. */
export function ModBadges({ mods, className }: { mods: string[]; className?: string }) {
  const list = mods.length ? mods : ["NM"];
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {list.map((m) => (
        <ModBadge key={m} mod={m} />
      ))}
    </div>
  );
}