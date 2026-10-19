import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, CheckCircle2, Home, LogIn, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { useAsync, LoadingBlock } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { formatDateTime, platformLabel, platformUserLabel } from "@/lib/utils";
import type { BotBindLinkInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TOKEN_KEY = "astracup_bind_token";

function readStoredToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeToken(value: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, value);
  } catch {
    // 隐私模式可能禁用 sessionStorage；此时登录回跳后需要重新获取链接
  }
}

function clearStoredToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function readTokenFromHash(): string {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return "";
  return new URLSearchParams(raw).get("token") ?? "";
}

export default function BotBindPage() {
  const { user, loading } = useApp();
  const [token, setToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  const inspect = useAsync<BotBindLinkInfo>();
  const confirm = useAsync<{
    osuId: string;
    username: string;
    platform: string;
    platformUserId: string;
  }>();
  const inspectRun = inspect.run;
  const confirmRun = confirm.run;

  // 链接形如 /bind#token=xxx：token 放在 fragment，不会进入服务器日志。
  useEffect(() => {
    const fromHash = readTokenFromHash();
    if (fromHash) {
      storeToken(fromHash);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setToken(fromHash || readStoredToken());
    setTokenReady(true);
  }, []);

  // 登录后自动继续；token 存在 sessionStorage 中，跨 OAuth 往返保留
  useEffect(() => {
    if (!tokenReady || !token || !user) return;
    void inspectRun(() => api.post<BotBindLinkInfo>("/api/me/bot-bind-link", { token }));
  }, [tokenReady, token, user, inspectRun]);

  const handleLogin = async () => {
    setLoginBusy(true);
    const query = new URLSearchParams({ redirect: "/bind" }).toString();
    const res = await api.get<{ authUrl: string }>(`/api/auth/url?${query}`);
    setLoginBusy(false);
    if (res.ok && res.data.authUrl) {
      window.location.href = res.data.authUrl;
    } else {
      toast({
        variant: "destructive",
        title: "登录失败",
        description: res.ok ? "未获取到授权地址" : res.error.message,
      });
    }
  };

  const handleConfirm = async () => {
    const res = await confirmRun(() =>
      api.post<{ osuId: string; username: string; platform: string; platformUserId: string }>(
        "/api/me/bot-bind-link/confirm",
        { token },
      ),
    );
    if (res?.ok) {
      clearStoredToken();
      setToken("");
      toast({ title: "绑定成功" });
    }
  };

  if (loading || !tokenReady) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <LoadingBlock label="加载绑定信息…" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-pc-primary" />
              绑定链接无效
            </CardTitle>
            <CardDescription>
              链接缺少绑定令牌，可能已被复制不完整，或者你直接打开了本页面。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-(--pc-slate)">
              请回到 QQ 私聊，向机器人发送 <span className="font-mono">/bind</span>{" "}
              获取新的绑定链接。
            </p>
            <Button asChild variant="outline">
              <Link to="/">
                <Home className="h-4 w-4" />
                返回首页
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-pc-blue" />
              登录后继续绑定
            </CardTitle>
            <CardDescription>
              需要使用 osu! 账号登录，确认把当前 QQ / 平台账号绑定到你的选手资料。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border-2 border-pc-yellow/40 bg-pc-yellow/15 p-4 text-sm text-(--pc-slate)">
              绑定后，该平台账号可以通过机器人查询和修改你的比赛预约。请确认链接来自你本人的私聊。
            </div>
            <Button variant="primary" onClick={() => void handleLogin()} disabled={loginBusy}>
              <LogIn className="h-4 w-4" />
              {loginBusy ? "正在获取授权链接…" : "使用 osu! 账号登录并继续"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirm.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-pc-teal" />
              绑定成功
            </CardTitle>
            <CardDescription>
              {platformUserLabel(confirm.data.platform, confirm.data.platformUserId)} 已绑定到{" "}
              {confirm.data.username}（osu! ID {confirm.data.osuId}）。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-(--pc-slate)">
              回到 QQ 私聊发送 <span className="font-mono">/me</span>{" "}
              验证绑定是否生效，然后就可以查询和预约比赛了。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="primary">
                <Link to="/player-info">前往个人中心</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  返回首页
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inspect.loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <LoadingBlock label="校验绑定链接…" />
      </div>
    );
  }

  if (inspect.error || !inspect.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-pc-primary" />
              无法使用该绑定链接
            </CardTitle>
            <CardDescription>{inspect.error ?? "绑定链接无效。"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-(--pc-slate)">
              请回到 QQ 私聊，向机器人重新发送 <span className="font-mono">/bind</span>。
            </p>
            <Button asChild variant="outline">
              <Link to="/player-info">前往个人中心</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const info = inspect.data;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-pc-blue" />
            确认绑定机器人账号
          </CardTitle>
          <CardDescription>确认后，该平台账号可以通过机器人操作你的比赛预约。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-xl bg-(--pc-paper) px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-(--pc-faint)">平台账号</span>
              <span className="text-right font-bold text-(--pc-ink)">
                {platformLabel(info.platform)}
                <br />
                {platformUserLabel(info.platform, info.platformUserId)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-(--pc-faint)">绑定到</span>
              <span className="text-right font-bold text-(--pc-ink)">
                {info.username}
                <br />
                <span className="text-xs font-normal text-(--pc-faint)">
                  osu! ID {info.osuId}
                </span>
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-(--pc-faint)">链接有效期</span>
              <span className="text-right text-(--pc-slate)">{formatDateTime(info.expiresAt)}</span>
            </div>
          </div>

          {info.alreadyBound ? (
            <div className="rounded-xl border-2 border-pc-teal/40 bg-pc-teal/15 p-4 text-sm text-(--pc-slate)">
              该平台账号已经绑定到当前 osu! 账号。确认后会刷新绑定信息。
            </div>
          ) : (
            <div className="rounded-xl border-2 border-pc-yellow/40 bg-pc-yellow/15 p-4 text-sm text-(--pc-slate)">
              <p className="flex items-center gap-2 font-bold text-(--pc-ink)">
                <ShieldAlert className="h-4 w-4" />
                请确认这是你自己的平台账号
              </p>
              <p className="mt-1">
                确认后，这个平台账号（QQ / openid）可以通过机器人查询和修改你的比赛预约。
                如果你不认识这个账号，请不要确认，并在个人中心检查已有绑定。
              </p>
            </div>
          )}

          {confirm.error && (
            <div className="rounded-xl border-2 border-pc-primary/40 bg-pc-primary/10 p-4 text-sm font-bold text-pc-primary">
              {confirm.error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void handleConfirm()} disabled={confirm.loading}>
              {confirm.loading ? "绑定中…" : "确认这是我的账号并绑定"}
            </Button>
            <Button asChild variant="outline">
              <Link to="/player-info" onClick={() => clearStoredToken()}>
                取消
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
