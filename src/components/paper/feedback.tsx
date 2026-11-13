import { Button } from "@/components/ui/button";

/** 标准 loading / empty / error placeholder blocks wrapped in Paper Craft style. */
export function LoadingBlock({
  label = "加载中…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-2" role="status">
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-md border-2 border-(--pc-border) border-t-pc-primary"
        />
        <span className="font-sans text-xs text-(--pc-faint)">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-2xl border-4 border-(--pc-border) border-t-pc-primary"
      />
      <span className="font-sans text-xs text-(--pc-faint)">{label}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-(--pc-white) p-6 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
      <p className="font-bold text-pc-primary">出错了</p>
      <p className="mt-2 text-sm text-(--pc-slate)">{message}</p>
      {onRetry && (
        <Button variant="teal" size="sm" className="mt-4" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}
