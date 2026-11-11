import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatLine, RefRoomState } from "@/lib/ref";
import { osuAvatarUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const matchStatusMeta: Record<RefRoomState["status"], { label: string; variant: "teal" | "yellow" | "primary" }> = {
  Idle: { label: "空闲", variant: "teal" },
  Playing: { label: "比赛中", variant: "yellow" },
  Aborted: { label: "已中止", variant: "primary" },
};

interface ChatPanelProps {
  lines: ChatLine[];
  matchStatus: RefRoomState["status"];
  disabled?: boolean;
  onSend: (text: string) => void;
}

/** 中栏上半：聊天（用户消息 + 系统消息）+ 发送框（支持 /roll、!mp 本地命令） */
export default function ChatPanel({ lines, matchStatus, disabled, onSend }: ChatPanelProps) {
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
          <div className="flex flex-col gap-2">
            {lines.map((line) =>
              line.kind === "system" ? (
                <div
                  key={line.id}
                  className="border-b border-dashed border-(--pc-border) px-1 pb-1 font-mono text-xs italic text-(--pc-slate)"
                >
                  {line.content}
                </div>
              ) : (
                <div key={line.id} className="flex items-start gap-2">
                  <img
                    src={line.avatarUrl ?? osuAvatarUrl(line.userId) ?? undefined}
                    alt=""
                    className="h-8 w-8 rounded-full border-2 border-(--pc-border) bg-(--pc-white)"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-(--pc-ink)">{line.username}</div>
                    <div
                      className={
                        line.isAction
                          ? "break-words text-sm italic text-(--pc-slate)"
                          : "break-words text-sm text-(--pc-ink)"
                      }
                    >
                      {line.isAction ? `* ${line.username} ${line.content}` : line.content}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
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
