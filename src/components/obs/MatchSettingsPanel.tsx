import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ObsController } from "./useObsController";
import {
  BO_OPTIONS,
  CATEGORY_OPTIONS,
  type MatchMode,
  type TeamKey,
} from "./types";

const TEAM_META: { key: TeamKey; label: string; accent: string; soft: string }[] = [
  { key: "red", label: "红方", accent: "bg-[#e85d75]", soft: "border-[#e85d75]/40" },
  { key: "blue", label: "蓝方", accent: "bg-[#6b7fb5]", soft: "border-[#6b7fb5]/40" },
];

function Section({
  title,
  tag,
  className,
  children,
}: {
  title: string;
  tag?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl bg-white p-5 shadow-[6px_6px_0px_rgba(0,0,0,0.12)]", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        {tag ? (
          <span
            className={cn(
              "rounded-lg px-2 py-0.5 text-xs font-bold text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.1)]",
              tag === "teal" ? "bg-[#5cb8a5]" : tag === "blue" ? "bg-[#6b7fb5]" : "bg-[#e85d75]",
            )}
          >
            {title}
          </span>
        ) : (
          <h2 className="text-lg font-black text-[#2d2d2d]">{title}</h2>
        )}
      </div>
      {children}
    </div>
  );
}

export function MatchSettingsPanel({ ctl }: { ctl: ObsController }) {
  const { state } = ctl;
  const bo = state.match.boFormat;

  return (
    <div className="flex flex-col gap-5">
      <Section title="赛制与队伍" tag="red">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label>赛制 (Best of)</Label>
            <Select
              value={String(bo)}
              onValueChange={(v) => ctl.setBoFormat(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BO_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    BO{n}（先胜 {Math.ceil(n / 2)} 局）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>比赛模式</Label>
            <Select
              value={state.match.mode}
              onValueChange={(v) => ctl.setMode(v as MatchMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1v1">单挑 (1v1)</SelectItem>
                <SelectItem value="team">团队 (Team)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>比赛标题</Label>
            <Input
              value={state.match.matchTitle}
              onChange={(e) => ctl.setMatchTitle(e.target.value)}
              placeholder="例：八强赛 B 组"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>房间名</Label>
            <Input
              value={state.match.roomName}
              onChange={(e) => ctl.setRoomName(e.target.value)}
              placeholder="mp 房间名"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>图池赛季</Label>
            <Select value={ctl.category} onValueChange={(v) => ctl.setCategory(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>操作提示</Label>
            <div className="flex h-10 items-center rounded-xl border-2 border-[#e0d8cc] bg-[#fdf6ee] px-3 text-xs font-bold text-[#666666]">
              点击下方禁/选按钮，再点击图卡
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        {TEAM_META.map(({ key, label, accent, soft }) => {
          const team = state.teams[key];
          return (
            <Section key={key} title={`${label}队伍`} className={cn("border-2", soft)}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn("h-4 w-4 rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.15)]", accent)} />
                  <Input
                    value={team.name}
                    onChange={(e) => ctl.setTeamName(key, e.target.value)}
                    placeholder={`${label}战队名称`}
                  />
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="yellow" onClick={() => ctl.incScore(key)}>
                      ++ 分数
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => ctl.decScore(key)}>
                      回到上一帧
                    </Button>
                  </div>
                </div>

                {team.players.map((p, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-[11px] font-bold text-[#666666]">选手 {i + 1} · 昵称</span>
                      <Input
                        value={p.username}
                        onChange={(e) => ctl.setPlayer(key, i, "username", e.target.value)}
                        placeholder="osu! 昵称"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-[11px] font-bold text-[#666666]">头像链接</span>
                      <Input
                        value={p.avatarUrl}
                        onChange={(e) => ctl.setPlayer(key, i, "avatarUrl", e.target.value)}
                        placeholder="https://…/avatar.png"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      aria-label="删除选手"
                      onClick={() => ctl.removePlayer(key, i)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}

                <Button variant={key === "red" ? "destructive" : "outline"} onClick={() => ctl.addPlayer(key)}>
                  + 添加选手
                </Button>
              </div>
            </Section>
          );
        })}
      </div>

      <Section title="计时器与掷骰 & 胜负" tag="teal">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border-2 border-[#e0d8cc] bg-[#fdf6ee] p-4">
            <span className="font-bold text-[#2d2d2d]">计时器</span>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-white px-5 py-2 font-sans text-3xl font-black text-[#2d2d2d] shadow-[3px_3px_0px_rgba(0,0,0,0.1)]">
                {String(Math.floor(state.timer.seconds / 60)).padStart(2, "0")}:
                {String(state.timer.seconds % 60).padStart(2, "0")}
              </span>
              <div className="flex gap-1.5">
                {!state.timer.running ? (
                  <Button size="sm" variant="teal" onClick={ctl.timerStart}>
                    开始
                  </Button>
                ) : (
                  <Button size="sm" variant="yellow" onClick={ctl.timerPause}>
                    暂停
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={ctl.timerReset}>
                  重置
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-[#666666]">快速设置：</span>
              {[5, 10, 15, 20].map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant="outline"
                  onClick={() => ctl.quickSetMinutes(m)}
                >
                  {m} 分钟
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label className="shrink-0 w-14">标签</Label>
              <Input
                value={state.timer.label}
                onChange={(e) => ctl.setTimerLabel(e.target.value)}
                placeholder="例：决胜局 / 15 分钟休息"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border-2 border-[#e0d8cc] bg-[#fdf6ee] p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2d2d2d]">掷骰决胜 (0-99)</span>
              <Button size="sm" variant="destructive" onClick={ctl.resetRoll}>
                重置
              </Button>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" variant="destructive" onClick={() => ctl.doRoll("red")}>
                掷红方 · {state.roll.red}
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => ctl.doRoll("blue")}>
                掷蓝方 · {state.roll.blue}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-xl border-2 border-[#e85d75]/40 bg-[#fdf6ee] p-4">
            <span className="text-sm font-bold text-[#2d2d2d]">设置夺冠队伍</span>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant={state.victory.winner === "red" ? "default" : "destructive"}
                onClick={() => ctl.setVictory("red")}
              >
                红方获胜
              </Button>
              <Button
                className="flex-1"
                variant={state.victory.winner === "blue" ? "primary" : "outline"}
                onClick={() => ctl.setVictory("blue")}
              >
                蓝方获胜
              </Button>
              <Button variant="outline" onClick={() => ctl.setVictory(null)}>
                清除
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}