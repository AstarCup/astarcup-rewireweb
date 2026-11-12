import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EMOJI_PACKS } from "@/lib/emoji-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 选中后插入的 token（不含冒号） */
  onPick: (token: string) => void;
}

/** 自定义表情选择器：按表情包浏览 / 搜索，点选插入 `:token:` */
export default function EmojiPicker({ open, onOpenChange, onPick }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [packId, setPackId] = useState<string>(ALL);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPackId(ALL);
  }, [open]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const packs = packId === ALL ? EMOJI_PACKS : EMOJI_PACKS.filter((p) => p.id === packId);
    return packs.flatMap((p) =>
      p.emojis.filter(
        (e) => !q || e.name.toLowerCase().includes(q) || e.token.toLowerCase().includes(q),
      ),
    );
  }, [query, packId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-3">
        <DialogHeader>
          <DialogTitle className="text-lg">插入表情</DialogTitle>
          <DialogDescription>
            这些表情会以 <code className="font-bold">:名称:</code> 的形式写进 Markdown，前台按图片显示。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={packId} onValueChange={setPackId}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部表情包（{EMOJI_PACKS.length}）</SelectItem>
              {EMOJI_PACKS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}（{p.emojis.length}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--pc-faint)" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索表情名…"
              className="h-9 pl-8"
            />
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto rounded-xl border-2 border-(--pc-border) bg-(--pc-white) p-2">
          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-(--pc-faint)">没有匹配的表情</p>
          ) : (
            <div className="grid grid-cols-6 gap-1 sm:grid-cols-8 md:grid-cols-10">
              {list.map((emoji) => (
                <button
                  key={emoji.token}
                  type="button"
                  title={`:${emoji.token}:`}
                  onClick={() => {
                    onPick(emoji.token);
                    onOpenChange(false);
                  }}
                  className="flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors hover:bg-(--pc-paper) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pc-primary/40"
                >
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10 object-contain"
                  />
                  <span className="w-full truncate text-center text-[10px] text-(--pc-slate)">
                    {emoji.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <span className="mr-auto text-xs text-(--pc-faint)">
            共 {list.length} 个{query.trim() ? "匹配" : ""}表情
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
