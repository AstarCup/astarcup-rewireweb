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
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await fetcherRef.current();
    // 忽略过期响应，避免快速切换时“后到覆盖先到”
    if (id !== requestIdRef.current) return res.ok;
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
  const requestIdRef = useRef(0);
  const run = useCallback(async (fn: () => Promise<ApiResult<T>>) => {
    const id = ++requestIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await fn();
    // 忽略过期响应，避免快速切换时“后到覆盖先到”
    if (id !== requestIdRef.current) return res;
    if (res.ok) setState({ data: res.data, loading: false, error: null });
    else setState((s) => ({ ...s, loading: false, error: res.error.message }));
    return res;
  }, []);
  return { ...state, run };
}
