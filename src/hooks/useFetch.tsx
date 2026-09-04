import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "@/lib/api";

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Simple data fetching hook around the api client.
 * `load()` is stable and can be re-invoked to refetch.
 */
export function useFetch<T>(fetcher: () => Promise<ApiResult<T>>) {
  const [state, setState] = useState<UseFetchState<T>>({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await fetcherRef.current();
    if (res.ok) setState({ data: res.data, loading: false, error: null });
    else setState((s) => ({ ...s, loading: false, error: res.error.message }));
    return res.ok;
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, load, refetch: load };
}

/** Manual (non-auto) fetch hook — call `run` to execute. */
export function useAsync<T>() {
  const [state, setState] = useState<UseFetchState<T>>({ data: null, loading: false, error: null });
  const run = useCallback(async (fn: () => Promise<ApiResult<T>>) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await fn();
    if (res.ok) setState({ data: res.data, loading: false, error: null });
    else setState((s) => ({ ...s, loading: false, error: res.error.message }));
    return res;
  }, []);
  return { ...state, run };
}

/** Standard loading / empty / error placeholder blocks wrapped in Paper Craft style. */
export function LoadingBlock({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-2xl border-4 border-[#e0d8cc] border-t-[#e85d75]"
      />
      <span className="font-sans text-xs text-[#b0a898]">{label}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
      <p className="font-bold text-[#e85d75]">出错了</p>
      <p className="mt-2 text-sm text-[#666666]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-xl bg-[#5cb8a5] px-4 py-2 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
        >
          重试
        </button>
      )}
    </div>
  );
}