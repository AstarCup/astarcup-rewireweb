import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { EMOJI_PACKS } from "@/lib/emoji-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ALL = "__all__";

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 选中后插入的 token（不含冒号） */
  onPick: (token: string) => void;
}

/** 表情选择器：大图网格 + 底部表情包条（参考聊天表情面板的布局） */
export default function EmojiPicker({ open, onOpenChange, onPick }: EmojiPickerProps) {
  const [packId, setPackId] = useState<string>(ALL);
  const stripRef = useRef<HTMLDivElement>(null);
  const activeTileRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPackId(ALL);
  }, [open]);

  // 切换表情包后把选中的包滚到中间
  useEffect(() => {
    activeTileRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [packId]);

  const list = useMemo(() => {
    if (packId === ALL) return EMOJI_PACKS.flatMap((p) => p.emojis);
    return EMOJI_PACKS.find((p) => p.id === packId)?.emojis ?? [];
  }, [packId]);

  const currentPack = EMOJI_PACKS.find((p) => p.id === packId);
  const scrollStrip = (dir: -1 | 1) => {
    stripRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-3">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-lg">插入表情</DialogTitle>
            <Badge variant="outline">
              {currentPack ? currentPack.name : `全部（${EMOJI_PACKS.length} 包）`}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            点表情插入到光标处，Markdown 里写作 <code className="font-bold">:名称:</code>
          </DialogDescription>
        </DialogHeader>

        {/* 表情网格 */}
        <div className="h-[380px] min-w-0 overflow-y-auto rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-2">
          <div className="grid min-w-0 grid-cols-[repeat(5,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(6,minmax(0,1fr))]">
            {list.map((emoji) => (
              <button
                key={emoji.token}
                type="button"
                title={`:${emoji.token}:`}
                onClick={() => {
                  onPick(emoji.token);
                  onOpenChange(false);
                }}
                className="flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-xl p-1.5 transition-colors hover:bg-(--pc-paper) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pc-primary/40"
              >
                <img
                  src={emoji.url}
                  alt={emoji.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
        </div>

        {/* 底部表情包条 */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="向左滚动表情包"
            onClick={() => scrollStrip(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div
            ref={stripRef}
            className="flex flex-1 items-center gap-2 overflow-x-auto scroll-smooth py-1"
          >
            <button
              type="button"
              title={`全部表情（${EMOJI_PACKS.length} 包）`}
              onClick={() => setPackId(ALL)}
              className={cn(
                "grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 transition-colors",
                packId === ALL
                  ? "border-pc-primary bg-pc-primary/10 text-pc-primary"
                  : "border-(--pc-border) text-(--pc-faint) hover:bg-(--pc-paper)",
              )}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            {EMOJI_PACKS.map((pack) => {
              const active = pack.id === packId;
              const cover = pack.emojis[0];
              return (
                <button
                  key={pack.id}
                  type="button"
                  title={pack.name}
                  ref={active ? activeTileRef : undefined}
                  onClick={() => setPackId(pack.id)}
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border-2 p-1 transition-colors",
                    active
                      ? "border-pc-primary bg-pc-primary/10"
                      : "border-(--pc-border) hover:bg-(--pc-paper)",
                  )}
                >
                  {cover && (
                    <img
                      src={cover.url}
                      alt={pack.name}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="向右滚动表情包"
            onClick={() => scrollStrip(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
