import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import type { ApiResult } from "@/lib/api";

/** osu! OAuth 授权地址响应 */
export interface AuthUrlResponse {
  authUrl: string;
}

/** 绑定回跳错误码 → 文案 */
export const BIND_ERROR_TEXT: Record<string, string> = {
  disabled: "绑定功能未启用",
  state_mismatch: "安全校验失败，请重新绑定",
  no_code: "未获取到授权码",
  network: "网络错误，无法连接服务器",
  token_failed: "换取令牌失败",
  token_missing: "令牌响应缺少 access_token",
  token_parse: "令牌响应解析失败",
  me_failed: "获取用户信息失败",
  me_parse: "用户信息响应解析失败",
  me_id_missing: "用户信息缺少 id",
  db_error: "写入绑定信息失败",
};

/**
 * 获取 osu! OAuth 授权地址并跳转（登录 / 绑定等场景共用）。
 * fetcher 传入对应后端接口（需返回 { authUrl }）。
 * start() 返回错误文案；null 表示已跳转成功。
 */
export function useOsuAuth(fetcher: () => Promise<ApiResult<AuthUrlResponse>>) {
  const [busy, setBusy] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const start = useCallback(async (): Promise<string | null> => {
    setBusy(true);
    const res = await fetcherRef.current();
    if (res.ok && res.data?.authUrl) {
      window.location.href = res.data.authUrl;
      return null;
    }
    setBusy(false);
    return res.ok ? "未获取到授权地址，请稍后重试" : res.error.message;
  }, []);

  return { busy, start };
}

/**
 * OAuth 回跳处理：?bound=1 或 ?error=/?reason=错误码 → toast 提示并清理地址栏参数。
 * 仅在挂载时处理一次。
 */
export function useOAuthCallback({
  successTitle = "绑定成功",
  errorTitle = "绑定失败",
  errorText,
}: {
  successTitle?: string;
  errorTitle?: string;
  /** 覆盖/补充错误码文案 */
  errorText?: Record<string, string>;
} = {}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bound = params.get("bound");
    const reason = params.get("reason") ?? params.get("error") ?? "";
    if (bound === "1") {
      toast({ title: successTitle });
    } else if (bound === "error" || reason) {
      const text = { ...BIND_ERROR_TEXT, ...errorText };
      toast({
        variant: "destructive",
        title: errorTitle,
        description: text[reason] ?? (reason || undefined),
      });
    }
    if (bound || reason) {
      params.delete("bound");
      params.delete("reason");
      params.delete("error");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
      );
    }
    // 仅挂载时处理一次回跳参数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
