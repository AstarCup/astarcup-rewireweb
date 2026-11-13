import { useEffect, useRef, useState } from "react";
import { ArrowDown, Bot, Loader2, Send } from "lucide-react";
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

const matchStatusMeta: Record<
  RefRoomState["status"],
  { label: string; variant: "teal" | "yellow" | "primary" }
> = {
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
  /** 裁判助手开关（默认开启） */
  agentEnabled?: boolean;
  onToggleAgent?: () => void;
  /** 裁判助手处理中（聊天区显示提示） */
  agentBusy?: boolean;
  onSend: (text: string) => void;
}

/** 中栏上半：聊天（用户消息 + 系统消息）+ 发送框（支持 /roll、!mp 本地命令） */
export default function ChatPanel({
  lines,
  matchStatus,
  meId,
  disabled,
  agentEnabled,
  onToggleAgent,
  agentBusy,
  onSend,
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  /** 首次加载 / 切换会话时直接定位到底部；之后在底部则自动跟随，不在底部才出“新消息”按钮 */
  const stickToBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const prevLen = prevLenRef.current;
    prevLenRef.current = lines.length;
    if (lines.length === 0) {
      stickToBottomRef.current = true;
      isAtBottomRef.current = true;
      setNewCount(0);
      return;
    }
    if (stickToBottomRef.current) {
      stickToBottomRef.current = false;
      isAtBottomRef.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }
    const delta = lines.length - prevLen;
    if (delta > 0) {
      if (isAtBottomRef.current) {
        // 本来就在底部：自动跟随
        el.scrollTop = el.scrollHeight;
      } else {
        // 在上面看：只计数，由右下角按钮回到底部
        setNewCount((c) => c + delta);
      }
    }
  }, [lines]);

  const scrollToBottom = () => {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    isAtBottomRef.current = true;
    setNewCount(0);
  };

  const handleScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    isAtBottomRef.current = atBottom;
    if (atBottom) setNewCount(0);
  };

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
          {onToggleAgent && (
            <Button
              variant={agentEnabled ? "primary" : "outline"}
              size="sm"
              aria-pressed={agentEnabled}
              onClick={onToggleAgent}
              title="裁判助手开关：!mp pick / ban / bp 等自动裁判命令"
            >
              <Bot className="h-3.5 w-3.5" />
              裁判助手
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="relative">
          <div
            ref={boxRef}
            onScroll={handleScroll}
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
            {agentBusy && (
              <div className="mt-2 flex items-center gap-2 px-1 font-mono text-xs italic text-(--pc-slate)">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                裁判助手处理中…
              </div>
            )}
          </div>
          {newCount > 0 && (
            <button
              type="button"
              onClick={scrollToBottom}
              title="回到最新消息"
              className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full border-2 border-pc-primary bg-pc-primary px-3 py-1.5 text-xs font-bold text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {newCount} 条新消息
            </button>
          )}
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
