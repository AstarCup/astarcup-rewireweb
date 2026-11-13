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
        <span
          aria-hidden
          className="paper-stack__under paper-stack__under--1 rounded-2xl bg-pc-yellow/70"
        />
      )}
      {layers >= 3 && (
        <span
          aria-hidden
          className="paper-stack__under paper-stack__under--2 rounded-2xl bg-pc-teal/70"
        />
      )}
      <div className="relative rounded-2xl bg-(--pc-white) shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </div>
  );
}

/** Section heading with a small colored paper tag (avoid standard eyebrow). */
export function SectionTitle({
  children,
  tag,
  accent = "var(--pc-primary)",
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
          className="mb-2 inline-block rounded-lg px-2 py-0.5 text-xs font-bold text-pc-cream shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: accent }}
        >
          {tag}
        </span>
      )}
      <h2 className="font-bold text-2xl md:text-3xl text-(--pc-ink)">{children}</h2>
    </div>
  );
}

/** 空状态占位（Paper Craft 风格） */
export function EmptyState({
  label,
  title,
  icon,
  action,
  className,
}: {
  label?: ReactNode;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-(--pc-white) p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      {icon && <div className="mb-3 flex justify-center">{icon}</div>}
      {title && <p className="text-2xl font-bold text-pc-primary">{title}</p>}
      {label && (
        <p className={cn("font-sans text-sm text-(--pc-faint)", title && "mt-2")}>{label}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** 章节标题行：标题与操作按钮横向排布（操作区作为 children 跟在标题之后，自动靠右） */
export function SectionHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      {children}
    </div>
  );
}

/** 内联提示条（错误/警告文案） */
export function InlineAlert({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border-2 border-pc-primary/40 bg-pc-primary/10 p-4 text-sm font-bold text-pc-primary",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Paper page header banner. */
export function PageHeader({
  title,
  subtitle,
  accent = "var(--pc-primary)",
}: {
  title: string;
  subtitle?: ReactNode;
  accent?: string;
}) {
  return (
    <header className="relative overflow-hidden border-b-2 border-(--pc-border) px-4 py-12 md:px-8 md:py-16 bg-(--pc-paper)">
      <span
        aria-hidden
        className="absolute -left-6 top-6 h-24 w-24 rotate-[-6deg] rounded-2xl opacity-40"
        style={{ backgroundColor: accent }}
      />
      <span
        aria-hidden
        className="absolute right-10 top-8 h-14 w-14 rotate-12 rounded-xl bg-pc-yellow opacity-50"
      />
      <div className="relative mx-auto max-w-6xl">
        <h1 className="font-bold text-4xl md:text-6xl text-(--pc-ink)">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-xl text-sm md:text-base text-(--pc-slate)">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
