import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatLine, RefRoomState } from "@/lib/ref";
import { cn, osuAvatarUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message";

const matchStatusMeta: Record<RefRoomState["status"], { label: string; variant: "teal" | "yellow" | "primary" }> = {
  Idle: { label: "空闲", variant: "teal" },
  Playing: { label: "比赛中", variant: "yellow" },
  Aborted: { label: "已中止", variant: "primary" },
};

interface ChatPanelProps {
  lines: ChatLine[];
  matchStatus: RefRoomState["status"];
  /** 当前裁判的 osu! id：自己的消息靠右显示 */
  meId?: string | null;
  disabled?: boolean;
  onSend: (text: string) => void;
}

/** 中栏上半：聊天（用户消息 + 系统消息）+ 发送框（支持 /roll、!mp 本地命令） */
export default function ChatPanel({ lines, matchStatus, meId, disabled, onSend }: ChatPanelProps) {
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  // 新消息进来时，如果本来就在底部附近，就跟着滚到底
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  const status = matchStatusMeta[matchStatus];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base md:text-lg">聊天</CardTitle>
        <div className="flex items-center gap-2 text-xs text-(--pc-slate)">
          <span>状态</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div
          ref={boxRef}
          className="h-96 overflow-y-auto rounded-xl border-2 border-(--pc-border) bg-(--pc-paper) p-3"
        >
          {lines.length === 0 && (
            <p className="py-8 text-center text-sm text-(--pc-faint)">暂无消息…</p>
          )}
          <MessageGroup className="gap-2">
            {lines.map((line) => {
              if (line.kind === "system") {
                return (
                  <div
                    key={line.id}
                    className="border-b border-dashed border-(--pc-border) px-1 pb-1 font-mono text-xs italic text-(--pc-slate)"
                  >
                    {line.content}
                  </div>
                );
              }
              const isMe = meId != null && String(line.userId) === meId;
              return (
                <Message key={line.id} align={isMe ? "end" : "start"}>
                  <MessageAvatar className="h-8 w-8 border-2 border-(--pc-border) bg-(--pc-white)">
                    <img
                      src={line.avatarUrl ?? osuAvatarUrl(line.userId) ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </MessageAvatar>
                  <MessageContent>
                    <MessageHeader>
                      {line.username}
                      {isMe && <span className="font-normal text-(--pc-faint)">（你）</span>}
                    </MessageHeader>
                    <div
                      data-slot="bubble"
                      className={cn(
                        "w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border-2 px-3 py-1.5 text-sm",
                        isMe
                          ? "border-pc-primary/30 bg-pc-primary/10 text-(--pc-ink)"
                          : "border-(--pc-border) bg-(--pc-white) text-(--pc-ink)",
                        line.isAction && "italic text-(--pc-slate)",
                      )}
                    >
                      {line.isAction ? `* ${line.username} ${line.content}` : line.content}
                    </div>
                  </MessageContent>
                </Message>
              );
            })}
          </MessageGroup>
        </div>
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            disabled={disabled}
            placeholder="发送消息，或输入 /roll、!mp help 使用命令…"
          />
          <Button onClick={submit} disabled={disabled}>
            <Send className="h-4 w-4" /> 发送
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
