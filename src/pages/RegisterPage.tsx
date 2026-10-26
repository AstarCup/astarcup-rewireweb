import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, LogOut, ShieldCheck, Home } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/components/layout/Logo";

interface AuthUrlResponse {
  authUrl: string;
}

const errorMessages: Record<string, string> = {
  auth_failed: "osu! 授权失败，请重试。",
  no_code: "未能获取授权码，请重新登录。",
  token_failed: "登录令牌校验失败，请重试。",
};

export default function RegisterPage() {
  const { user, logout } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const error = searchParams.get("error");
  const success = searchParams.get("success");

  const [fetching, setFetching] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const errorText = error ? errorMessages[error] ?? "登录失败，请重试。" : null;

  // Auto-redirect to home after a successful login.
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate("/"), 3000);
    return () => clearTimeout(t);
  }, [success, navigate]);

  const handleOsuLogin = async () => {
    setFetching(true);
    setUrlError(null);
    const res = await api.get<AuthUrlResponse>("/api/auth/url");
    if (res.ok) {
      window.location.href = res.data.authUrl;
      return;
    }
    setFetching(false);
    setUrlError(res.error.message);
  };

  // Logged in state
  if (user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <Logo full />
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>已经登录</CardTitle>
            <CardDescription>你已使用 {user.username} 的 osu! 账号登录。</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-pc-teal text-pc-cream shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold text-(--pc-ink)">{user.username}</p>
              <p className="text-xs text-(--pc-faint)">{user.osuId}</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button asChild variant="outline">
              <Link to="/">返回首页</Link>
            </Button>
            <Button variant="destructive" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:px-8">
      <div className="flex justify-center">
        <Logo full />
      </div>

      <Card className="mt-8 rotate-[0.2deg]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-pc-primary" />
            登录 / 报名
          </CardTitle>
          <CardDescription>使用 osu! 账号登录，即可完成报名。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorText && (
            <div className="rounded-xl border-2 border-pc-primary/40 bg-pc-primary/10 p-4 text-sm font-bold text-pc-primary">
              {errorText}
            </div>
          )}
          {urlError && (
            <div className="rounded-xl border-2 border-pc-primary/40 bg-pc-primary/10 p-4 text-sm font-bold text-pc-primary">
              {urlError}
            </div>
          )}

          <Button
            size="lg"
            variant="primary"
            className="w-full"
            disabled={fetching}
            onClick={() => void handleOsuLogin()}
          >
            {fetching ? "正在获取授权链接…" : "使用 osu! 账号登录"}
          </Button>

          <div className="rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-4 text-xs leading-relaxed text-(--pc-slate)">
            <p className="mb-1 font-bold text-(--pc-ink)">隐私说明</p>
            <p>
              登录仅获取你的昵称、头像及 basic profile（osuId、pp、排名等）用于赛事报名与
              对阵展示，不会公开其他私人信息。
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/">
              <Home className="h-4 w-4" />
              返回首页
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {success && (
        <div className="mt-6 rounded-2xl bg-pc-teal/15 border-2 border-pc-teal/40 p-4 text-center text-sm font-bold text-(--pc-ink)">
          登录成功！正在跳转首页…
        </div>
      )}
    </div>
  );
}