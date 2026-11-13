import { useState } from "react";
import JSZip from "jszip";
import { Download, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusyButton } from "@/components/ui/busy-button";
import { toast } from "@/hooks/use-toast";
import { blob, downloadBlob } from "@/lib/api";
import { mapFileName, mapFileSid, oppPoolLink } from "@/lib/mappool";
import type { MapSelection } from "@/lib/types";

/** 图池批量下载（打包为 zip） */
export function BulkDownload({ maps, className }: { maps: MapSelection[]; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const downloadables = maps.filter((m) => mapFileSid(m) != null);
  const skipped = maps.length - downloadables.length;

  const run = async () => {
    if (downloadables.length === 0) return;
    setBusy(true);
    setProgress({ done: 0, total: downloadables.length });
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      let okCount = 0;
      let processed = 0;
      for (const m of downloadables) {
        try {
          const b = await blob(`/api/beatmaps/download?sid=${mapFileSid(m)}&source=sayobot`);
          // 同名谱面（同 artist/title/version）避免在 zip 内互相覆盖
          let name = mapFileName(m);
          if (usedNames.has(name)) name = name.replace(/\.osz$/, `_${m.beatmapId}.osz`);
          usedNames.add(name);
          zip.file(name, b);
          okCount += 1;
        } catch {
          /* 单图失败跳过，不中断整体打包 */
        }
        processed += 1;
        setProgress({ done: processed, total: downloadables.length });
      }
      if (okCount > 0) {
        const out = await zip.generateAsync({ type: "blob" });
        downloadBlob(out, `mappool_${new Date().toISOString().slice(0, 10)}.zip`);
        toast({ title: "图池已下载", description: `成功 ${okCount} / 共 ${downloadables.length}` });
      } else {
        toast({ variant: "destructive", title: "下载失败", description: "没有可下载的谱面" });
      }
    } catch {
      toast({ variant: "destructive", title: "下载失败", description: "打包或下载出错" });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <BusyButton
        variant="teal"
        size="sm"
        loading={busy}
        icon={<Download className="h-4 w-4" />}
        onClick={() => void run()}
        disabled={downloadables.length === 0}
      >
        {busy ? `打包中 ${progress?.done ?? 0}/${progress?.total ?? 0}` : "下载图池"}
      </BusyButton>
      {skipped > 0 && !busy && (
        <span className="text-xs text-(--pc-faint)">{skipped} 张原创图不支持打包</span>
      )}
    </div>
  );
}

/** OPP 工具联动按钮：唤起 OPP 打开当前赛季/轮次图池 */
export function OppPoolButton({
  season,
  category,
  className,
}: {
  season: string;
  category: string;
  className?: string;
}) {
  return (
    <Button asChild variant="primary" size="sm" className={className}>
      <a href={oppPoolLink(season, category)}>
        <Wrench className="h-4 w-4" />
        从OPP中打开图池
      </a>
    </Button>
  );
}
