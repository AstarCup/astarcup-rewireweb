import { useState } from "react";
import JSZip from "jszip";
import { Copy, Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { blob, downloadBlob } from "@/lib/api";
import { fmt } from "@/lib/utils";
import type { MapSelection } from "@/lib/types";

/** Beatmapset id usable for /api/beatmaps/download (custom/original maps excluded). */
export function mapFileSid(m: MapSelection): number | null {
  return m.beatmapsetId != null && m.beatmapsetId > 0 ? m.beatmapsetId : null;
}

export function mapFileName(m: MapSelection): string {
  const base = [m.artist, m.title, `[${m.version}]`].filter(Boolean).join(" - ");
  return (base.replace(/[\\/:*?"<>|]/g, "_") || `map_${m.beatmapId}`) + ".osz";
}

function titleOf(m: MapSelection): string {
  return [m.artist, m.version].filter(Boolean).join(" - ") || m.title || "未知曲目";
}

export async function downloadSingleMap(m: MapSelection): Promise<boolean> {
  const sid = mapFileSid(m);
  if (sid == null) return false;
  const b = await blob(`/api/beatmaps/download?sid=${sid}&source=sayobot`);
  downloadBlob(b, mapFileName(m));
  return true;
}

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
    const zip = new JSZip();
    let okCount = 0;
    for (const m of downloadables) {
      try {
        const b = await blob(`/api/beatmaps/download?sid=${mapFileSid(m)}&source=sayobot`);
        zip.file(mapFileName(m), b);
        okCount += 1;
      } catch {
        /* 单图失败跳过，不中断整体打包 */
      }
      setProgress({ done: okCount, total: downloadables.length });
    }
    if (okCount > 0) {
      const out = await zip.generateAsync({ type: "blob" });
      downloadBlob(out, `mappool_${new Date().toISOString().slice(0, 10)}.zip`);
      toast({ title: "图池已下载", description: `成功 ${okCount} / 共 ${downloadables.length}` });
    } else {
      toast({ variant: "destructive", title: "下载失败", description: "没有可下载的谱面" });
    }
    setBusy(false);
    setProgress(null);
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button
        variant="teal"
        size="sm"
        onClick={() => void run()}
        disabled={busy || downloadables.length === 0}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            打包中 {progress?.done ?? 0}/{progress?.total ?? 0}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            下载图池
          </>
        )}
      </Button>
      {skipped > 0 && !busy && (
        <span className="text-xs text-(--pc-faint)">{skipped} 张原创图不支持打包</span>
      )}
    </div>
  );
}

/** 表格行悬浮详情卡（fixed 定位避免被容器裁剪） */
export function MapHoverCard({
  map,
  rect,
}: {
  map: MapSelection;
  rect: { left: number; top: number; bottom: number };
}) {
  const width = 320;
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
  const top = rect.bottom + 8;
  const stats: [string, string][] = [
    ["星级", `${fmt(map.starRating)}★`],
    ["CS", fmt(map.cs)],
    ["AR", fmt(map.ar)],
    ["OD", fmt(map.od)],
    ["HP", fmt(map.hp)],
    ["BPM", map.bpm != null ? String(map.bpm) : "-"],
    ["时长", map.totalLength != null ? `${Math.round(map.totalLength)}s` : "-"],
    ["MaxCombo", map.maxCombo != null ? String(map.maxCombo) : "-"],
  ];

  const copyBid = () => {
    void navigator.clipboard
      .writeText(String(map.beatmapId))
      .then(() => toast({ title: "已复制 BID", description: String(map.beatmapId) }))
      .catch(() => toast({ variant: "destructive", title: "复制失败" }));
  };

  return (
    <div
      className="fixed z-50 w-[320px] overflow-hidden rounded-2xl border-2 border-(--pc-border) bg-(--pc-white) shadow-[6px_6px_0px_rgba(0,0,0,0.14)]"
      style={{ left, top }}
    >
      {map.coverUrl ? (
        <img src={map.coverUrl} alt={map.title} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-[#f5c040]/30 px-4">
          <span className="line-clamp-2 text-center text-sm font-bold text-(--pc-ink)">
            {map.title || "未命名图"}
          </span>
        </div>
      )}
      <div className="grid gap-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="border-[#6b7fb5]/40 text-[#6b7fb5]">
              {map.modPosition ?? map.selectedMods ?? "NM"}
            </Badge>
            <Badge className="border-[#5cb8a5] bg-[#5cb8a5] text-[#fdf6ee]">
              {map.selectedMods ?? "NM"}
            </Badge>
            {map.isCustome && <Badge variant="yellow">订制</Badge>}
            {map.isOrigin && <Badge variant="blue">原创</Badge>}
          </div>
          <p className="mt-2 font-bold text-sm text-(--pc-ink)">{titleOf(map)}</p>
          {map.creator && <p className="text-xs text-(--pc-faint)">谱师：{map.creator}</p>}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-(--pc-paper) px-1.5 py-1 text-center">
              <p className="text-[10px] text-(--pc-faint)">{k}</p>
              <p className="text-xs font-bold text-(--pc-ink)">{v}</p>
            </div>
          ))}
        </div>
        {map.customModName && (
          <p className="text-xs text-(--pc-slate)">
            自定义 Mod：<span className="font-bold text-[#6b7fb5]">{map.customModName}</span>
            {map.customDTRate ? ` (DT ×${map.customDTRate})` : ""}
          </p>
        )}
        {map.comment && <p className="text-xs text-(--pc-faint)">备注：{map.comment}</p>}
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={copyBid}>
            <Copy className="h-3.5 w-3.5" />
            复制 BID
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <a href={map.url ?? `https://osu.ppy.sh/beatmaps/${map.beatmapId}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              osu!
            </a>
          </Button>
          <Button
            variant="teal"
            size="sm"
            onClick={() => {
              void downloadSingleMap(map).then((ok) =>
                ok
                  ? toast({ title: "开始下载" })
                  : toast({ variant: "destructive", title: "该图不支持下载" }),
              );
            }}
          >
            <Download className="h-3.5 w-3.5" />
            下载
          </Button>
        </div>
      </div>
    </div>
  );
}
