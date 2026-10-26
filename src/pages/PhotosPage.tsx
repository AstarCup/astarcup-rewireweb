import { useMemo, useState } from "react";
import { PageHeader, SectionTitle } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import winnersJson from "@/data/winners.json";
import { osuAvatarUrl } from "@/lib/utils";

interface WinnerCard {
  id: string;
  playerName: string;
  osuId: string;
  avatarUrl?: string;
  rank: number;
  country?: string;
  season: string;
  frameStyle: string;
}

interface WinnerPhoto {
  id: string;
  imageUrl: string;
  caption: string;
  season: string;
}

interface WinnersData {
  cards: WinnerCard[];
  photos: WinnerPhoto[];
  seasons?: { seasonId: string }[];
}

const winners = winnersJson as unknown as WinnersData;

const FRAMES: Record<string, string> = {
  gold: "bg-pc-yellow",
  silver: "bg-(--pc-border)",
  bronze: "bg-[#d8a76e]",
};

const rankLabels: Record<number, string> = { 1: "冠军", 2: "亚军", 3: "季军" };

export default function PhotosPage() {
  // 赛季列表由数据推导，避免在页面里写死 s1/s2
  const seasons = useMemo(() => {
    const set = new Set<string>();
    winners.seasons?.forEach((s) => set.add(s.seasonId));
    winners.cards.forEach((c) => set.add(c.season));
    winners.photos.forEach((p) => set.add(p.season));
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, []);
  const [season, setSeason] = useState(() => seasons[seasons.length - 1] ?? "");

  const cards = winners.cards.filter((c) => c.season === season);
  const photos = winners.photos.filter((p) => p.season === season);

  return (
    <div>
      <PageHeader title="历届风采" subtitle="AstarCup 历届比赛的获胜选手与精彩瞬间。" accent="var(--pc-yellow)" />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-10 flex items-center gap-3">
          {seasons.map((se) => (
            <Button
              key={se}
              variant={season === se ? "primary" : "outline"}
              onClick={() => setSeason(se)}
            >
              {se.toUpperCase()}
            </Button>
          ))}
          <span className="text-sm text-(--pc-faint)">当前赛季：{season.toUpperCase()}</span>
        </div>

        <SectionTitle tag="获奖选手">本届获胜选手</SectionTitle>
        {cards.length === 0 ? (
          <p className="text-(--pc-faint)">暂无选手信息。</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const frame = FRAMES[card.frameStyle] ?? "bg-(--pc-white)";
              const avatar = card.avatarUrl || osuAvatarUrl(card.osuId);
              return (
                <div
                  key={card.id}
                  className={`rounded-2xl p-2 shadow-[4px_4px_0px_rgba(0,0,0,0.08)] ${frame}`}
                >
                  <Card className="flex flex-col items-center p-6 text-center">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={card.playerName}
                        loading="lazy"
                        className="h-20 w-20 rounded-full border-2 border-(--pc-border) object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-(--pc-border) bg-(--pc-paper) font-bold text-2xl text-(--pc-faint)">
                        {card.playerName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="mt-4 text-sm font-bold text-(--pc-faint)">
                      {rankLabels[card.rank] ?? `第 ${card.rank} 名`}
                    </div>
                    <h3 className="mt-1 font-bold text-xl text-(--pc-ink)">{card.playerName}</h3>
                    {card.country && (
                      <span className="mt-1 text-sm text-(--pc-slate)">{card.country}</span>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        <SectionTitle tag="精彩瞬间" className="mt-16">
          比赛剪影
        </SectionTitle>
        {photos.length === 0 ? (
          <p className="text-(--pc-faint)">暂无照片。</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2">
            {photos.map((photo) => (
              <figure key={photo.id}>
                <img
                  src={photo.imageUrl}
                  alt={photo.caption}
                  loading="lazy"
                  className="w-full rounded-2xl object-cover shadow-[4px_4px_0px_rgba(0,0,0,0.08)]"
                />
                <figcaption className="mt-3 text-center text-sm text-(--pc-slate)">
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}