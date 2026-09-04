import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DisplayScore, MapSelection } from "@/lib/types";
import { ScoreTable } from "./ScoreTable";
import { ModBadges } from "./modBadges";

function mapTitle(map: MapSelection): string {
  return [map.artist, map.version].filter(Boolean).join(" - ") || map.title || "未知曲目";
}

interface BeatmapGroupProps {
  index: number;
  beatmapId: number;
  map?: MapSelection;
  scores: DisplayScore[];
  isApproved?: (s: DisplayScore) => boolean;
  onlyApproved?: boolean;
  card: boolean;
}

/** One scored beatmap group: a title + mod labels header and a score table. */
export function BeatmapGroup({
  index,
  beatmapId,
  map,
  scores,
  isApproved,
  onlyApproved,
  card,
}: BeatmapGroupProps) {
  const title = map ? mapTitle(map) : `Beatmap ${beatmapId}`;
  const href = map?.url ?? `https://osu.ppy.sh/beatmaps/${beatmapId}`;
  const slot = map?.modPosition ?? map?.selectedMods ?? null;
  const mapMods = map?.selectedMods ? map.selectedMods.split("+") : [];

  const header = (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-center gap-2",
        card && "mb-4",
      )}
    >
      <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-lg bg-[#e85d75] px-2 text-xs font-bold text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
        {index}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-bold text-[#2d2d2d] transition-colors hover:text-[#e85d75]"
      >
        {title}
      </a>
      {slot && (
        <span className="rounded-lg border border-[#6b7fb5]/40 bg-[#6b7fb5]/10 px-2 py-0.5 text-xs font-bold text-[#6b7fb5]">
          {slot}
        </span>
      )}
      {mapMods.length > 0 && <ModBadges mods={mapMods} />}
      <span className="text-xs text-[#b0a898]">{scores.length} 条记录</span>
    </div>
  );

  if (card) {
    return (
      <Card className="p-4 md:p-5">
        {header}
        <ScoreTable
          scores={scores}
          isApproved={isApproved}
          onlyApproved={onlyApproved}
          variant="flat"
        />
      </Card>
    );
  }

  return (
    <section>
      {header}
      <ScoreTable scores={scores} isApproved={isApproved} onlyApproved={onlyApproved} variant="boxed" />
    </section>
  );
}