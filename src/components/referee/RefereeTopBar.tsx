import { useState } from "react";
import { Copy, Gavel, Loader2, Plug, Settings, UserPlus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  hub,
  invokeHub,
  resolveUserId,
  roomLink,
  slotCountError,
  type ChangeRoomSettingsParams,
  type RefConnectionState,
  type RefRoomState,
} from "@/lib/ref";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RefereeTopBarProps {
  room: RefRoomState;
  connState: RefConnectionState;
  lastError: string | null;
  onReconnect: () => void;
  reconnecting: boolean;
  onCloseRoom: () => void;
}

const connMeta: Record<RefConnectionState, { label: string; dot: string }> = {
  connected: { label: "已连接", dot: "bg-pc-teal" },
  connecting: { label: "连接中", dot: "bg-pc-yellow" },
  disconnected: { label: "已断开", dot: "bg-pc-primary" },
};

/** 顶栏：房名 / 复制房间链接 / Chat ID / Add Referee / Settings / Close Room / 连接状态 */
export default function RefereeTopBar({
  room,
  connState,
  lastError,
  onReconnect,
  reconnecting,
  onCloseRoom,
}: RefereeTopBarProps) {
  // Add Referee 弹窗
  const [refOpen, setRefOpen] = useState(false);
  const [refUserId, setRefUserId] = useState("");
  const [refBusy, setRefBusy] = useState(false);

  // Settings 下拉（Popover 承载表单）
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState(room.name);
  const [password, setPassword] = useState(room.password ?? "");
  const [unlimited, setUnlimited] = useState(room.maxParticipants == null);
  const [maxParticipants, setMaxParticipants] = useState(
    room.maxParticipants != null ? String(room.maxParticipants) : "",
  );
  const [type, setType] = useState<"head_to_head" | "team_versus">(room.type);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  /** 房间密码默认打码，点「显示」才明文 */
  const [showPassword, setShowPassword] = useState(false);

  const openSettings = () => {
    setName(room.name);
    setPassword(room.password ?? "");
    setUnlimited(room.maxParticipants == null);
    setMaxParticipants(room.maxParticipants != null ? String(room.maxParticipants) : "");
    setType(room.type);
    setSlotsError(null);
    setShowPassword(false);
    setSettingsOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink(room.id));
      toast({ title: "房间链接已复制", description: roomLink(room.id) });
    } catch {
      toast({ variant: "destructive", title: "复制失败", description: "请手动复制：" + roomLink(room.id) });
    }
  };

  const submitAddReferee = async () => {
    const raw = refUserId.trim();
    if (!raw) {
      toast({ variant: "destructive", title: "请输入用户名或 osu! ID" });
      return;
    }
    setRefBusy(true);
    const userId = await resolveUserId(raw);
    if (userId == null) {
      setRefBusy(false);
      toast({ variant: "destructive", title: "找不到该用户", description: raw });
      return;
    }
    const res = await invokeHub(hub.addReferee(room.id, userId));
    setRefBusy(false);
    if (res.ok) {
      toast({ title: "已添加裁判", description: `用户 #${userId}` });
      setRefOpen(false);
      setRefUserId("");
    } else {
      toast({ variant: "destructive", title: "添加裁判失败", description: res.error.message });
    }
  };

  const submitSettings = async () => {
    const p: ChangeRoomSettingsParams = { type };
    if (name.trim()) p.name = name.trim();
    if (password.trim()) p.password = password.trim();
    if (unlimited) {
      p.max_participants = 0;
      setSlotsError(null);
    } else if (maxParticipants.trim() !== "") {
      const n = Number(maxParticipants);
      const err = slotCountError(n);
      if (err) {
        setSlotsError(err);
        return;
      }
      p.max_participants = n;
      setSlotsError(null);
    }
    setSettingsBusy(true);
    const res = await invokeHub(hub.changeRoomSettings(room.id, p));
    setSettingsBusy(false);
    if (res.ok) {
      toast({ title: "房间设置已提交" });
      setSettingsOpen(false);
    } else {
      toast({ variant: "destructive", title: "修改房间设置失败", description: res.error.message });
    }
  };

  const closeRoom = async () => {
    if (!window.confirm(`确定要永久关闭房间 ${room.id} 吗？此操作不可撤销。`)) return;
    const res = await invokeHub(hub.closeRoom(room.id));
    if (res.ok) {
      toast({ title: "房间已关闭" });
      onCloseRoom();
    } else {
      toast({ variant: "destructive", title: "关闭房间失败", description: res.error.message });
    }
  };

  const meta = connMeta[connState];

  return (
    <div className="sticky top-16 z-30 border-b-2 border-(--pc-border) bg-(--pc-paper)/95 px-3 backdrop-blur-sm sm:px-4 md:px-6">
      <div className="flex flex-wrap items-center gap-2 py-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-(--pc-ink)">
          <Gavel className="h-5 w-5 text-pc-primary" />
          {room.name}
        </h2>
        <Badge variant="outline">房间 #{room.id}</Badge>
        <Badge variant="outline">Chat ID: {room.chatChannelId}</Badge>

        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" /> 复制房间链接
        </Button>

        <Button variant="teal" size="sm" onClick={() => setRefOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" /> 添加裁判
        </Button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Popover open={settingsOpen} onOpenChange={(o) => (o ? openSettings() : setSettingsOpen(false))}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm">
                <Settings className="h-3.5 w-3.5" /> 房间设置
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="grid gap-3">
                <div className="text-sm font-bold text-(--pc-ink)">房间设置</div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ref-settings-name">房间名</Label>
                  <Input
                    id="ref-settings-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={room.name}
                  />
                </div>
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ref-settings-password">房间密码</Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      className="text-[11px] font-bold text-pc-primary hover:underline focus-visible:underline focus:outline-none"
                    >
                      {showPassword ? "隐藏" : "显示"}
                    </button>
                  </div>
                  <Input
                    id="ref-settings-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="不修改请留空"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ref-settings-max">最大人数</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="ref-settings-max"
                      type="number"
                      min={2}
                      max={16}
                      value={maxParticipants}
                      disabled={unlimited}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      placeholder="2-16"
                    />
                    <Button
                      type="button"
                      variant={unlimited ? "primary" : "outline"}
                      size="sm"
                      aria-pressed={unlimited}
                      onClick={() => setUnlimited((u) => !u)}
                    >
                      不限
                    </Button>
                  </div>
                  {slotsError && <p className="text-xs text-destructive">{slotsError}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label>比赛类型</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-sm text-(--pc-slate)">
                      <input
                        type="radio"
                        name="ref-match-type"
                        checked={type === "head_to_head"}
                        onChange={() => setType("head_to_head")}
                      />
                      个人赛
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-(--pc-slate)">
                      <input
                        type="radio"
                        name="ref-match-type"
                        checked={type === "team_versus"}
                        onChange={() => setType("team_versus")}
                      />
                      团队赛
                    </label>
                  </div>
                </div>
                <Button size="sm" onClick={submitSettings} disabled={settingsBusy}>
                  {settingsBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 应用
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="destructive" size="sm" onClick={closeRoom}>
            <X className="h-3.5 w-3.5" /> 关闭房间
          </Button>

          <div className="flex items-center gap-2 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-3 py-1.5">
            <span
              aria-hidden
              className={cn(
                "h-2.5 w-2.5 rounded-full shadow-[1px_1px_0px_rgba(0,0,0,0.1)]",
                meta.dot,
              )}
            />
            <span className="text-xs font-bold text-(--pc-slate)" title={lastError ?? undefined}>
              {meta.label}
            </span>
            {connState === "disconnected" && (
              <Button variant="outline" size="sm" onClick={onReconnect} disabled={reconnecting}>
                {reconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plug className="h-3.5 w-3.5" />
                )}
                重连
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={refOpen} onOpenChange={setRefOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加裁判</DialogTitle>
            <DialogDescription>
              输入对方的 osu! 用户名或 ID（支持 #123456），添加后对方即可协助执裁。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="ref-invite-userid">用户名 / 用户 ID</Label>
            <Input
              id="ref-invite-userid"
              value={refUserId}
              onChange={(e) => setRefUserId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitAddReferee();
              }}
              placeholder="例如 applearon 或 123456"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRefOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={submitAddReferee} disabled={refBusy}>
              {refBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              邀请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
