import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Gamepad2, Home, LogOut, ShieldCheck, Trophy, User } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { useFetch, useAsync, LoadingBlock } from "@/hooks/useFetch";
import { toast } from "@/hooks/use-toast";
import { fmtInt, formatDateTime } from "@/lib/utils";
import type { MatchRoom, NextMatch, Settings } from "@/lib/types";
import { seasonLabel } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import RegisterDialog from "@/components/RegisterDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  available: "可预约",
  pending: "待确认",
  scheduled: "已预约",
  completed: "已完成",
};

const statusBadgeVariant: Record<string, "teal" | "blue" | "yellow" | "primary"> = {
  available: "teal",
  pending: "yellow",
  scheduled: "blue",
  completed: "primary",
};

const registrationLabels: Record<string, string> = {
  registered: "待审核",
  approved: "已通过",
};

export default function PlayerInfoPage() {
  const { user, permissions, settings, loading, refresh, logout } = useApp();
  const navigate = useNavigate();

  const {
    data: nextMatch,
    loading: nextLoading,
    error: nextError,
    refetch: reloadNext,
  } = useFetch<NextMatch | null>(() => api.get<NextMatch | null>("/api/me/next-match"));

  // Next-match booking dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const rooms = useAsync<MatchRoom[]>();
  const booking = useAsync<{ matchupId: number; messageId: number; room?: MatchRoom }>();
  // 只显示可预约房间：未被安排/占用，且距比赛开始超过 2 小时（已过期或临近 2 小时内均不可约）
  const BOOK_WINDOW_MS = 2 * 60 * 60 * 1000;
  const bookableRooms = (rooms.data ?? []).filter((r) => {
    if (r.claimed) return false;
    if (!r.matchTime) return true;
    return new Date(r.matchTime).getTime() - Date.now() > BOOK_WINDOW_MS;
  });

  // Redirect unauthenticated users to register.
  useEffect(() => {
    if (!loading && !user) navigate("/register", { replace: true });
  }, [loading, user, navigate]);

  // Registration dialog state
  const [registerOpen, setRegisterOpen] = useState(false);

  // ---- g0v0 服务器绑定 ----
  const [searchParams] = useSearchParams();
  const [bindBusy, setBindBusy] = useState(false);

  // OAuth 回调后跳转提示 + 清理地址栏参数
  useEffect(() => {
    const b = searchParams.get("bound");
    if (b === "1") toast({ title: "g0v0 绑定成功" });
    else if (b === "error") {
      const reason = searchParams.get("reason") ?? "";
      const text: Record<string, string> = {
        disabled: "绑定功能未启用",
        state_mismatch: "安全校验失败，请重新绑定",
        no_code: "未获取到授权码",
        network: "网络错误，无法连接 g0v0 服务器",
        token_failed: "换取 g0v0 令牌失败",
        token_missing: "令牌响应缺少 access_token",
        token_parse: "令牌响应解析失败",
        me_failed: "获取 g0v0 用户信息失败",
        me_parse: "g0v0 用户信息响应解析失败",
        me_id_missing: "g0v0 用户信息缺少 id",
        db_error: "写入绑定信息失败",
      };
      toast({
        variant: "destructive",
        title: "g0v0 绑定失败",
        description: text[reason] ?? reason,
      });
    }
    if (b) window.history.replaceState(null, "", "/player-info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <LoadingBlock label="加载个人信息…" />
      </div>
    );
  }

  if (!user) {
    return null; // useEffect redirects to /register
  }

  const isAdmin = !!permissions?.isadmin;
  const canBook = nextMatch?.status === "available";

  // ---- g0v0 服务器绑定 ----
  const handleBind = async () => {
    setBindBusy(true);
    const res = await api.get<{ authUrl: string }>("/api/bind/url");
    setBindBusy(false);
    if (res.ok && res.data.authUrl) {
      window.location.href = res.data.authUrl;
    } else {
      toast({
        variant: "destructive",
        title: "绑定失败",
        description: !res.ok ? res.error.message : "未获取到授权地址，请稍后重试",
      });
    }
  };
  const handleUnbind = async () => {
    setBindBusy(true);
    const res = await api.post("/api/bind/unbind");
    setBindBusy(false);
    if (res.ok) {
      toast({ title: "已解除 g0v0 绑定" });
      await refresh();
    } else {
      toast({
        variant: "destructive",
        title: "解绑失败",
        description: res.error?.message,
      });
    }
  };

  const openBookingDialog = async () => {
    setSelectedRoomId("");
    rooms.run(() =>
      api.get<MatchRoom[]>("/api/rooms" + qs({ status: "open", withSchedules: true })),
    );
    setDialogOpen(true);
  };

  const confirmBooking = async () => {
    if (!nextMatch) return;
    const res = await booking.run(() =>
      api.post<{ matchupId: number; messageId: number; room?: MatchRoom }>("/api/schedules", {
        matchupId: nextMatch.id,
        roomId: Number(selectedRoomId),
        sendNotification: true,
      }),
    );
    if (res.ok) {
      setDialogOpen(false);
      toast({ title: "预约成功", description: "通知已发送。" });
      await reloadNext();
      await refresh();
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      {user.registrationStatus === "not_registered" && (
        <Card className="mb-6 overflow-hidden">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#e85d75]" />
                报名参赛
              </CardTitle>
              <CardDescription className="mt-1">
                你尚未报名本赛季，点击下方按钮完成报名，等待管理员审核。
              </CardDescription>
            </div>
            <Button variant="primary" size="lg" onClick={() => setRegisterOpen(true)}>
              立即报名
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <h1 className="font-bold text-3xl text-(--pc-ink) md:text-4xl">个人中心</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="h-4 w-4" />
              回到首页
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#6b7fb5]" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold text-xl text-(--pc-ink)">{user.username}</p>
                </div>
                <p className="mt-1 text-xs text-(--pc-faint)">osuId: {user.osuId}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-(--pc-paper) p-3">
                <p className="text-lg font-bold text-(--pc-ink)">{fmtInt(user.pp)}</p>
                <p className="text-xs text-(--pc-faint)">PP</p>
              </div>
              <div className="rounded-xl bg-(--pc-paper) p-3">
                <p className="text-lg font-bold text-(--pc-ink)">#{fmtInt(user.globalRank)}</p>
                <p className="text-xs text-(--pc-faint)">全球排名</p>
              </div>
              <div className="rounded-xl bg-(--pc-paper) p-3">
                <p className="text-lg font-bold text-(--pc-ink)">#{fmtInt(user.countryRank)}</p>
                <p className="text-xs text-(--pc-faint)">地区排名</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user.country && <Badge variant="outline">{user.country}</Badge>}
              {user.registrationStatus && (
                <Badge
                  variant={
                    user.registrationStatus === "approved" ? "teal" : "yellow"
                  }
                >
                  {registrationLabels[user.registrationStatus] ?? user.registrationStatus}
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="blue">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  管理员
                </Badge>
              )}
            </div>

            {user.season && user.season.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-(--pc-faint)">已报名参赛过的赛季</p>
                <div className="flex flex-wrap items-center gap-2">
                  {user.season.map((s) => (
                    <Badge key={s} variant="yellow">
                      <Trophy className="h-3.5 w-3.5" />
                      {seasonLabel(settings as Settings | null, s) || s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* g0v0 服务器绑定 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-[#5cb8a5]" />
              g0v0 服务器绑定
            </CardTitle>
            <CardDescription>报名比赛前需先绑定 g0v0 私服账号</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.g0v0Bound ? (
              <>
                <div className="rounded-xl bg-(--pc-paper) px-4 py-3">
                  <p className="text-xs text-(--pc-faint)">已绑定</p>
                  <p className="mt-0.5 font-bold text-(--pc-ink)">
                    {user.guServerUsername}
                  </p>
                  <p className="text-xs text-(--pc-faint)">
                    g0v0 ID：{user.guServerUserId}
                  </p>
                  {user.guServerBindAt && (
                    <p className="text-xs text-(--pc-faint)">
                      绑定于 {formatDateTime(user.guServerBindAt)}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => void handleUnbind()}
                  disabled={bindBusy}
                >
                  解绑
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-(--pc-faint)">
                  尚未绑定 g0v0 服务器账号，绑定后才能报名比赛。
                </p>
                <Button
                  variant="teal"
                  onClick={() => void handleBind()}
                  disabled={bindBusy}
                >
                  {bindBusy ? "跳转中…" : "绑定 g0v0 账号"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Next match */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>下一轮对阵</CardTitle>
            <CardDescription>对手信息与比赛预约</CardDescription>
          </CardHeader>
          <CardContent>
            {nextLoading ? (
              <LoadingBlock label="加载对阵信息…" />
            ) : nextError ? (
              <p className="rounded-xl bg-[#e85d75]/10 p-4 text-sm font-bold text-[#e85d75]">
                {nextError}
              </p>
            ) : nextMatch ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={nextMatch.opponent.avatarUrl ?? undefined}
                        alt={nextMatch.opponent.username}
                      />
                      <AvatarFallback>
                        {nextMatch.opponent.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-lg text-(--pc-ink)">
                        {nextMatch.opponent.username}
                      </p>
                      <p className="text-xs text-(--pc-faint)">opponent</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusBadgeVariant[nextMatch.status] ?? "outline"}>
                      {statusLabels[nextMatch.status] ?? nextMatch.status}
                    </Badge>
                    {canBook && (
                      <Button variant="teal" size="sm" onClick={() => void openBookingDialog()}>
                        预约对战
                      </Button>
                    )}
                  </div>
                </div>
                {nextMatch.room && (
                  <div className="space-y-1 rounded-xl bg-(--pc-paper) px-4 py-3 text-sm text-(--pc-slate)">
                    <div>
                      房间：
                      <span className="font-bold text-(--pc-ink)">
                        {nextMatch.room.roomName}
                      </span>
                    </div>
                    <div>
                      时间：
                      <span className="font-bold text-(--pc-ink)">
                        {formatDateTime(
                          nextMatch.room.matchDate || nextMatch.room.matchTime,
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <p className="text-sm text-(--pc-faint)">暂无下一轮对阵</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registration dialog */}
      <RegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />

      {/* Booking dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>预约对战</DialogTitle>
            <DialogDescription>
              选择一场空闲的比赛房间，系统将通知你的对手。
            </DialogDescription>
          </DialogHeader>

          {rooms.error && (
            <p className="rounded-xl bg-[#e85d75]/10 p-3 text-sm font-bold text-[#e85d75]">
              {rooms.error}
            </p>
          )}

          <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择比赛房间" />
            </SelectTrigger>
            <SelectContent>
              {rooms.loading && <SelectItem value="-1">加载中…</SelectItem>}
              {rooms.data && bookableRooms.length === 0 && (
                <SelectItem value="none" disabled>
                  暂无空闲房间
                </SelectItem>
              )}
              {bookableRooms.map((room) => (
                <SelectItem key={room.id} value={String(room.id)}>
                  {room.roomName}
                  {room.roundNumber ? ` (Round ${room.roundNumber})` : ""}
                  {" · "}
                  {formatDateTime(room.matchTime)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {booking.error && (
            <p className="rounded-xl bg-[#e85d75]/10 p-3 text-sm font-bold text-[#e85d75]">
              {booking.error}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="primary"
              disabled={!selectedRoomId || booking.loading}
              onClick={() => void confirmBooking()}
            >
              {booking.loading ? "预约中…" : "确认预约"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}