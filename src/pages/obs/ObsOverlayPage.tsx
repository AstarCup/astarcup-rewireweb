import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BanPickControls } from "@/components/obs/BanPickControls";
import { MapPoolGrid } from "@/components/obs/MapPoolGrid";
import { MatchSettingsPanel } from "@/components/obs/MatchSettingsPanel";
import { ScoreBoard } from "@/components/obs/ScoreBoard";
import { VictoryDisplay } from "@/components/obs/VictoryDisplay";
import { useObsController, type ObsController } from "@/components/obs/useObsController";

type ViewMode = "console" | "preview";

function PreviewScene({ ctl }: { ctl: ObsController }) {
  const s = ctl.state;
  const pickedIds = new Set(s.banPick.picked.map((m) => m.id));
  const bannedIds = new Set(s.banPick.banned.map((m) => m.id));
  const actionEnabled = s.banPick.phase !== "done" && ctl.currentAction !== null;
  const subtitle = s.match.roomName ? s.match.roomName : s.match.mode === "team" ? "团队模式" : "单挑模式";

  return (
    <div className="relative flex h-[1440px] w-[2560px] flex-col bg-[#fdf6ee] paper-texture">
      <header className="flex items-center justify-between px-16 pb-4 pt-10">
        <div className="flex flex-col">
          <h1 className="text-5xl font-black text-[#2d2d2d]">{s.match.matchTitle || "观赛直播"}</h1>
          <p className="mt-1 text-xl font-bold text-[#666666]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-2xl bg-[#6b7fb5] px-5 py-2 text-2xl font-black text-[#fdf6ee] shadow-[4px_4px_0px_rgba(0,0,0,0.15)]">
            BO{s.match.boFormat}
          </span>
          <span className="flex items-center gap-2 rounded-2xl bg-[#e85d75] px-5 py-2 text-2xl font-black text-[#fdf6ee] shadow-[4px_4px_0px_rgba(0,0,0,0.15)]">
            <i className="inline-block h-3 w-3 animate-pulse rounded-full bg-[#fdf6ee]" /> 开播中
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-16 pb-10">
        <ScoreBoard
          red={s.teams.red}
          blue={s.teams.blue}
          timer={s.timer}
          roll={s.roll}
          currentActiveMap={s.currentActiveMap}
          winner={s.victory.winner}
        />
        {ctl.maps.length > 0 && (
          <div className="w-full">
            <MapPoolGrid
              maps={ctl.maps}
              pickedIds={pickedIds}
              bannedIds={bannedIds}
              activeMapId={s.currentActiveMap?.id ?? null}
              currentAction={ctl.currentAction}
              phase={s.banPick.phase}
              compact
              actionEnabled={actionEnabled}
              onApplyTarget={(map) => {
                if (ctl.currentAction) ctl.applyAction(ctl.currentAction, map);
              }}
              onUndoMap={ctl.undoMap}
            />
          </div>
        )}
      </div>

      {s.victory.winner && <VictoryDisplay winner={s.victory.winner} teams={s.teams} />}
    </div>
  );
}

export default function ObsOverlayPage() {
  const ctl = useObsController();
  const [view, setView] = useState<ViewMode>("console");

  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  const scale = box.w > 0 && box.h > 0 ? Math.min(box.w / 2560, box.h / 1440) : 1;

  return (
    <div className="flex h-screen flex-col bg-[#fdf6ee] paper-texture">
      <header className="flex items-center justify-between border-b-2 border-[#e0d8cc] px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-[#2d2d2d]">OBS 赛事播控</h1>
          <span className="rounded-lg bg-[#e85d75]/10 px-2 py-0.5 text-xs font-bold text-[#e85d75]">
            纸艺手作
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-xl border-2 border-[#e0d8cc] bg-white p-1 shadow-[2px_2px_0px_rgba(0,0,0,0.06)]">
          {(["console", "preview"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-5 py-1.5 text-sm font-bold transition-colors",
                view === v
                  ? "bg-[#e85d75] text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
                  : "bg-transparent text-[#666666] hover:text-[#2d2d2d]",
              )}
            >
              {v === "console" ? "控制台" : "预览"}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {view === "console" ? (
          <div className="h-full overflow-y-auto px-6 py-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-10">
              {ctl.mapsLoading && (
                <div className="rounded-2xl bg-white px-5 py-4 text-sm font-bold text-[#666666] shadow-[6px_6px_0px_rgba(0,0,0,0.12)]">
                  正在加载图池…
                </div>
              )}
              {ctl.mapsError && (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-[6px_6px_0px_rgba(0,0,0,0.12)]">
                  <span className="text-sm font-bold text-[#e85d75]">图池加载失败：{ctl.mapsError}</span>
                  <Button size="sm" variant="outline" onClick={() => void ctl.loadMaps()}>
                    重试
                  </Button>
                </div>
              )}
              <MatchSettingsPanel ctl={ctl} />
              <BanPickControls ctl={ctl} />
            </div>
          </div>
        ) : (
          <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
            <div
              className="absolute inset-0 m-auto"
              style={{ width: 2560 * scale, height: 1440 * scale }}
            >
              <div
                className="overflow-hidden rounded-2xl bg-[#fdf6ee]"
                style={{
                  width: 2560,
                  height: 1440,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <PreviewScene ctl={ctl} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}