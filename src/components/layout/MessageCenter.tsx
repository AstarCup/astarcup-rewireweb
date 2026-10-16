import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_LABEL: Record<string, string> = {
  unread: "未读",
  read: "已读",
  archived: "已归档",
};

export default function MessageCenter() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const unread = messages.filter((m) => m.status === "unread").length;

  // 仅在页面加载（组件挂载）时获取一次，不做轮询
  const load = useCallback(async () => {
    const res = await api.get<Message[]>("/api/messages");
    if (res.ok) setMessages(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (m: Message, action: "read" | "accept" | "decline") => {
    setBusy(m.id);
    const res = await api.post("/api/messages", { messageId: m.id, action });
    setBusy(null);
    if (res.ok) void load();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative grid h-10 w-10 place-items-center rounded-xl bg-(--pc-white) shadow-[2px_2px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
          aria-label="消息通知"
        >
          <Bell className="h-5 w-5 text-(--pc-ink)" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-pc-primary px-1 text-[10px] font-bold text-pc-cream">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b-2 border-(--pc-border) px-4 py-3">
          <p className="font-bold text-(--pc-ink)">消息通知</p>
          <Badge variant={unread > 0 ? "primary" : "outline"}>{unread} 未读</Badge>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-(--pc-faint)">暂无消息</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="border-b border-(--pc-border)/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-(--pc-ink)">
                    {m.title || "通知"}
                  </p>
                  <Badge variant={m.status === "unread" ? "yellow" : "outline"}>
                    {STATUS_LABEL[m.status] ?? m.status}
                  </Badge>
                </div>
                {m.content && <p className="mt-1 text-xs text-(--pc-slate)">{m.content}</p>}
                <p className="mt-1 text-[10px] text-(--pc-faint)">
                  {m.senderUsername} · {formatDateTime(m.createdAt)}
                </p>
                {m.type === "match_invitation" && m.status === "unread" && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="teal"
                      onClick={() => void act(m, "accept")}
                      disabled={busy === m.id}
                    >
                      接受
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void act(m, "decline")}
                      disabled={busy === m.id}
                    >
                      拒绝
                    </Button>
                  </div>
                )}
                {m.status === "unread" && m.type !== "match_invitation" && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void act(m, "read")}
                      disabled={busy === m.id}
                    >
                      标记已读
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
