import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A multi-layer paper stack card that splays on hover. */
export function PaperStack({
  children,
  className,
  layers = 2,
}: {
  children: ReactNode;
  className?: string;
  layers?: 1 | 2 | 3;
}) {
  return (
    <div className={cn("paper-stack", className)}>
      {layers >= 2 && (
        <span aria-hidden className="paper-stack__under paper-stack__under--1 rounded-2xl bg-[#f5c040]/70" />
      )}
      {layers >= 3 && (
        <span aria-hidden className="paper-stack__under paper-stack__under--2 rounded-2xl bg-[#5cb8a5]/70" />
      )}
      <div className="relative rounded-2xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </div>
  );
}

/** Section heading with a small colored paper tag (avoid standard eyebrow). */
export function SectionTitle({
  children,
  tag,
  accent = "#e85d75",
  className,
}: {
  children: ReactNode;
  tag?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {tag && (
        <span
          className="mb-2 inline-block rounded-lg px-2 py-0.5 text-xs font-bold text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: accent }}
        >
          {tag}
        </span>
      )}
      <h2 className="font-bold text-2xl md:text-3xl text-[#2d2d2d]">{children}</h2>
    </div>
  );
}

/** Paper page header banner. */
export function PageHeader({
  title,
  subtitle,
  accent = "#e85d75",
}: {
  title: string;
  subtitle?: ReactNode;
  accent?: string;
}) {
  return (
    <header className="relative overflow-hidden border-b-2 border-[#e0d8cc] px-4 py-12 md:px-8 md:py-16 bg-[#fdf6ee]">
      <span
        aria-hidden
        className="absolute -left-6 top-6 h-24 w-24 rotate-[-6deg] rounded-2xl opacity-40"
        style={{ backgroundColor: accent }}
      />
      <span
        aria-hidden
        className="absolute right-10 top-8 h-14 w-14 rotate-12 rounded-xl bg-[#f5c040] opacity-50"
      />
      <div className="relative mx-auto max-w-6xl">
        <h1 className="font-bold text-4xl md:text-6xl text-[#2d2d2d]">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-xl text-sm md:text-base text-[#666666]">{subtitle}</p>
        )}
      </div>
    </header>
  );
}