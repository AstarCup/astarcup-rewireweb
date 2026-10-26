/**
 * Typed API client for the Rust backend (astracup-backend).
 * All requests go to same-origin paths (/api/...) proxied by Vite to the backend,
 * so the auth cookie (`astra_session`) is sent automatically.
 */

export interface ApiError {
  status: number;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T; message?: string } | { ok: false; error: ApiError };

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Send JSON body (default true). Set false for FormData. */
  json?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { body, json = true, headers, ...rest } = options;
  let reqBody: BodyInit | undefined;
  const reqHeaders: Record<string, string> = { ...(headers as Record<string, string>) };
  if (body !== undefined) {
    if (json) {
      reqHeaders["Content-Type"] = "application/json";
      reqBody = JSON.stringify(body);
    } else if (body instanceof FormData) {
      reqBody = body;
    } else if (typeof body === "string") {
      reqBody = body as BodyInit;
    }
  }

  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: reqHeaders,
      body: reqBody,
      credentials: "include",
    });
  } catch {
    return { ok: false, error: { status: 0, message: "网络错误，无法连接后端服务" } };
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      error: {
        status: res.status,
        message: payload?.error || payload?.message || `请求失败 (${res.status})`,
      },
    };
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.success) {
      return { ok: true, data: payload.data as T, message: payload.message };
    }
    return { ok: false, error: { status: res.status, message: payload.error || "请求失败" } };
  }

  return { ok: true, data: payload as T };
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "GET", ...options }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "POST", body, ...options }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "PUT", body, ...options }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "PATCH", body, ...options }),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "DELETE", body, ...options }),
};

/** Convenience: query string builder for GET params. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export async function blob(url: string): Promise<Blob> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`下载失败 (${res.status})`);
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}