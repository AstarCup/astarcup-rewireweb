import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/paper/paper";
import { LoadingBlock, ErrorBlock, useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { cn, fmtInt } from "@/lib/utils";
import type { PlayerStub } from "@/lib/types";

type FilterKey = "all" | "approved" | "registered";

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "approved", label: "已审核" },
  { key: "registered", label: "待审核" },
];

function statusBadge(status?: string) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="teal" className="border-[#5cb8a5] bg-[#5cb8a5] text-[#fdf6ee]">
          已审核
        </Badge>
      );
    case "registered":
      return (
        <Badge variant="yellow" className="border-[#f5c040] bg-[#f5c040] text-[#2d2d2d]">
          待审核
        </Badge>
      );
    default:
      return <Badge variant="outline">{status ?? "未知"}</Badge>;
  }
}

function PlayerCard({
  player,
  onSelect,
}: {
  player: PlayerStub;
  onSelect: (p: PlayerStub) => void;
}) {
  return (
    <button
      onClick={() => onSelect(player)}
      className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]"
    >
      <Avatar className="h-16 w-16 rounded-2xl border-2 border-[#e0d8cc]">
        <AvatarImage src={player.avatarUrl ?? undefined} alt={player.username} />
        <AvatarFallback className="bg-[#f5c040]/30 text-lg font-bold text-[#2d2d2d]">
          {player.username?.slice(0, 1).toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-bold text-[#2d2d2d]">{player.username}</p>
        <p className="mt-0.5 text-xs text-[#b0a898]">{player.country ?? "-"}</p>
      </div>
      <div className="flex w-full items-center justify-around text-center">
        <div className="flex-1">
          <p className="text-xs text-[#b0a898]">PP</p>
          <p className="font-sans font-bold text-[#6b7fb5]">{fmtInt(player.pp)}</p>
        </div>
        <div className="w-px self-stretch bg-[#e0d8cc]" />
        <div className="flex-1">
          <p className="text-xs text-[#b0a898]">世界排名</p>
          <p className="font-sans font-bold text-[#2d2d2d]">
            {player.globalRank != null ? `#${fmtInt(player.globalRank)}` : "-"}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function RegistrationsPage() {
  const { data, loading, error, load } = useFetch<PlayerStub[]>(() =>
    api.get<PlayerStub[]>("/api/users"),
  );
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<PlayerStub | null>(null);

  const players = data ?? [];

  const visible = useMemo(() => {
    if (filter === "all") return players;
    return players.filter((p) => p.registrationStatus === filter);
  }, [players, filter]);

  const counts = useMemo(() => {
    let approved = 0;
    let registered = 0;
    for (const p of players) {
      if (p.registrationStatus === "approved") approved += 1;
      else if (p.registrationStatus === "registered") registered += 1;
    }
    return { all: players.length, approved, registered };
  }, [players]);

  const countFor = (k: FilterKey) => (k === "all" ? counts.all : k === "approved" ? counts.approved : counts.registered);

  return (
    <div className="bg-[#fdf6ee]">
      <PageHeader
        title="参赛选手"
        subtitle={loading || error ? undefined : `共 ${counts.all} 名选手，${counts.approved} 名已审核`}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <Button
              key={t.key}
              variant={filter === t.key ? "teal" : "outline"}
              size="sm"
              onClick={() => setFilter(t.key)}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  filter === t.key ? "bg-[#fdf6ee]/25" : "bg-[#fdf6ee] text-[#666666]",
                )}
              >
                {countFor(t.key)}
              </span>
            </Button>
          ))}
        </div>

        {loading && <LoadingBlock label="正在加载参赛选手…" />}
        {error && <ErrorBlock message={error} onRetry={() => void load()} />}

        {!loading && !error && visible.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-sm text-[#b0a898]">暂无赛程</p>
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((p) => (
              <PlayerCard key={p.osuId} player={p} onSelect={setSelected} />
            ))}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          {selected && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selected.username}</DialogTitle>
                <DialogDescription>{selected.country ?? "未知地区"}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <Avatar className="h-24 w-24 rounded-2xl border-2 border-[#e0d8cc]">
                  <AvatarImage src={selected.avatarUrl ?? undefined} alt={selected.username} />
                  <AvatarFallback className="bg-[#f5c040]/30 text-2xl font-bold text-[#2d2d2d]">
                    {selected.username?.slice(0, 1).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                {statusBadge(selected.registrationStatus)}
                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border-2 border-[#e0d8cc] p-3">
                    <p className="text-xs text-[#b0a898]">PP</p>
                    <p className="mt-1 font-sans font-bold text-[#6b7fb5]">
                      {fmtInt(selected.pp)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border-2 border-[#e0d8cc] p-3">
                    <p className="text-xs text-[#b0a898]">世界排名</p>
                    <p className="mt-1 font-sans font-bold text-[#2d2d2d]">
                      {selected.globalRank != null ? `#${fmtInt(selected.globalRank)}` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border-2 border-[#e0d8cc] p-3">
                    <p className="text-xs text-[#b0a898]">地区排名</p>
                    <p className="mt-1 font-sans font-bold text-[#2d2d2d]">
                      {selected.countryRank != null ? `#${fmtInt(selected.countryRank)}` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border-2 border-[#e0d8cc] p-3">
                    <p className="text-xs text-[#b0a898]">国家/地区</p>
                    <p className="mt-1 font-bold text-[#2d2d2d]">{selected.country ?? "-"}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}