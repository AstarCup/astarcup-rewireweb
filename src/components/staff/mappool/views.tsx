import type { ReactElement } from "react";
import { CircleArrowRight, Clipboard, Download, Globe, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import UserAvatar from "@/components/UserAvatar";
import { PaperTable, Thead, Th } from "@/components/paper/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MOD_COLORS, MOD_DISPLAY, modBase } from "@/lib/mods";
import { CATEGORY_LABEL, seasonLabel } from "@/lib/types";
import { cn, fmt, formatDateTime, osuAvatarUrl } from "@/lib/utils";
import type { MapComment, MapSelection, Settings } from "@/lib/types";
import { fmtLength, osuMapUrl, sayobotUrl, starColor } from "./helpers";
import { ModStatCard, groupStats } from "./stats";

/** 表格 / 卡片视图共用的操作回调 */
export interface MapViewActions {
  onComment: (m: MapSelection) => void;
  onToggleApproved: (m: MapSelection) => void;
  onTogglePadding: (m: MapSelection) => void;
  onAdjust: (m: MapSelection) => void;
  onDelete: (m: MapSelection) => void;
  onCopyBid: (m: MapSelection) => void;
}

/** osu! 圆形图标（osu:// 链接用） */
function OsuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7.698 10.362a1.94 1.94 0 0 0-.7-.516q-.421-.189-.988-.189c-.567 0-.704.063-.982.189s-.51.298-.692.516q-.273.328-.413.777-.139.448-.139.96 0 .511.14.952.139.44.412.767.274.329.692.512t.982.184c.565 0 .707-.062.988-.184q.422-.184.7-.512.279-.327.413-.767.135-.44.135-.952a3.3 3.3 0 0 0-.135-.96 2.1 2.1 0 0 0-.413-.777m-.965 2.81q-.22.372-.723.372-.494 0-.713-.372-.22-.373-.22-1.073c0-.7.073-.824.22-1.073q.22-.372.713-.372.503 0 .723.372.22.373.22 1.073t-.22 1.073m11.89-.83-.09-4.39a4.5 4.5 0 0 1 .69-.054q.351 0 .701.054l-.09 4.39q-.315.053-.601.053a3.5 3.5 0 0 1-.61-.054m1.319 1.4q0 .332-.054.664a4 4 0 0 1-.655.054 4 4 0 0 1-.664-.054 4 4 0 0 1-.054-.655q0-.323.054-.665a4 4 0 0 1 .655-.054q.323 0 .664.054.054.341.054.656m-3.223-4.03q.315 0 .638.053v4.461q-.288.099-.759.193a5.246 5.246 0 0 1-1.863.023 1.7 1.7 0 0 1-.74-.305q-.32-.234-.507-.683-.189-.449-.189-1.193V9.765a4 4 0 0 1 .638-.054q.313 0 .637.054v2.46q0 .367.058.606a.9.9 0 0 0 .18.377.66.66 0 0 0 .3.197q.18.058.422.058.332 0 .557-.062V9.765a4 4 0 0 1 .628-.054m-4.362 2.683q.08.225.08.548a1.4 1.4 0 0 1-.542 1.117q-.265.212-.642.333-.378.12-.853.12a5 5 0 0 1-.395-.013 3 3 0 0 1-.346-.045 4 4 0 0 1-.327-.076 4 4 0 0 1-.35-.116 2.6 2.6 0 0 1 .085-.49 3 3 0 0 1 .175-.48q.296.117.561.175.265.06.552.059.126 0 .274-.023a1 1 0 0 0 .274-.08.65.65 0 0 0 .21-.153.35.35 0 0 0 .086-.247q0-.216-.13-.31a1.3 1.3 0 0 0-.364-.166l-.556-.162q-.503-.143-.786-.426-.282-.283-.283-.848 0-.682.49-1.068.489-.386 1.332-.386.35 0 .692.062.341.063.691.189a2.5 2.5 0 0 1-.09.485 2.3 2.3 0 0 1-.17.44 4 4 0 0 0-.476-.158 2.2 2.2 0 0 0-.548-.067q-.305 0-.476.094a.32.32 0 0 0-.17.301q0 .197.121.278t.346.153l.511.153q.252.072.454.175t.345.255.225.377M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12c6.628 0 12-5.373 12-12S18.628 0 12 0m0 22.8C6.035 22.8 1.2 17.965 1.2 12S6.035 1.2 12 1.2 22.8 6.035 22.8 12 17.965 22.8 12 22.8" />
    </svg>
  );
}

/** 右键菜单：表格视图内容更全，卡片视图精简 */
function MapContextMenu({
  map,
  actions,
  compact,
  children,
}: {
  map: MapSelection;
  actions: MapViewActions;
  compact?: boolean;
  children: ReactElement;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {!compact && (
          <>
            <ContextMenuItem onSelect={() => actions.onComment(map)}>
              <MessageSquare className="h-4 w-4" />
              评论
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => window.open(`osu://b/${map.beatmapId}`, "_blank")}>
              <OsuIcon className="h-4 w-4" />
              打开 osu direct
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => window.open(sayobotUrl(map), "_blank", "noopener,noreferrer")}
            >
              <Download className="h-4 w-4" />
              Sayobot 下载
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => window.open(osuMapUrl(map), "_blank", "noopener,noreferrer")}
            >
              <Globe className="h-4 w-4" />
              打开 osu beatmap web
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onSelect={() => actions.onToggleApproved(map)}>
          {map.approved ? "取消审核" : "通过审核"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.onTogglePadding(map)}>
          {map.padding ? "取消审图" : "标为审图"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.onAdjust(map)}>调整参数</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => actions.onDelete(map)} className="text-pc-primary">
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** 表格视图 */
export function MapTableView({ maps, actions }: { maps: MapSelection[]; actions: MapViewActions }) {
  return (
    <PaperTable minWidth={900} className="mt-4">
      <Thead>
        <tr>
          <Th>MOD</Th>
          <Th>BID</Th>
          <Th>封面</Th>
          <Th>歌曲</Th>
          <Th>谱师</Th>
          <Th>★</Th>
          <Th>AR</Th>
          <Th>CS</Th>
          <Th>OD</Th>
          <Th>BPM</Th>
          <Th>时长</Th>
          <Th>状态</Th>
        </tr>
      </Thead>
        <tbody>
          {maps.map((m) => (
            <MapContextMenu key={m.id} map={m} actions={actions}>
              <tr className="border-b border-(--pc-border)/60 hover:bg-(--pc-paper)">
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
                  >
                    {`${modBase(m)}${m.modPosition ?? ""}`}
                  </span>
                  {m.selectedMods?.toUpperCase() === "DT" && m.customDTRate != null && (
                    <span className="block text-xs font-bold text-[#a78bfa]">
                      x{Number(m.customDTRate).toFixed(2)}
                    </span>
                  )}
                  {m.customModName && (
                    <span className="ml-1 text-xs font-bold text-(--pc-slate)">
                      {m.customModName}
                    </span>
                  )}
                </td>
                <td
                  onClick={() => actions.onCopyBid(m)}
                  title="点击复制 BID"
                  className="cursor-pointer px-3 py-2.5 font-mono text-xs text-pc-primary transition-colors hover:bg-(--pc-paper)"
                >
                  {m.beatmapId}
                </td>
                <td className="min-w-15 x-3 py-2.5">
                  {m.coverUrl ? (
                    <img
                      src={m.coverUrl}
                      alt=""
                      className="h-10 w-16 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-10 w-16 rounded-md bg-pc-yellow/30" />
                  )}
                </td>
                <td className="px-3 py-2.5 font-bold text-(--pc-ink)">
                  {[m.artist_unicode || m.artist, m.title_unicode || m.title]
                    .filter(Boolean)
                    .join(" - ")}
                  <span className="text-(--pc-faint)"> [{m.version}]</span>
                </td>
                <td className="px-3 py-2.5 text-(--pc-slate)">{m.creator ?? "-"}</td>
                <td
                  className="px-3 py-2.5 font-sans font-bold"
                  style={{ color: starColor(m.starRating) }}
                >
                  {fmt(m.starRating)}
                </td>
                <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmt(m.ar)}</td>
                <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmt(m.cs)}</td>
                <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmt(m.od)}</td>
                <td className="px-3 py-2.5 font-sans text-(--pc-slate)">{fmt(m.bpm)}</td>
                <td className="px-3 py-2.5 font-sans text-(--pc-slate)">
                  {fmtLength(m.totalLength)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {m.approved ? (
                      <Badge variant="teal">已审核</Badge>
                    ) : (
                      <Badge variant="yellow">待审核</Badge>
                    )}
                    {m.padding && <Badge variant="blue">padding</Badge>}
                    {m.isOrigin && <Badge variant="blue">原创</Badge>}
                    {m.isCustome && <Badge variant="yellow">定制</Badge>}
                  </div>
                </td>
              </tr>
            </MapContextMenu>
          ))}
        </tbody>
    </PaperTable>
  );
}

function statCell(label: string, value: string, color?: string) {
  return (
    <div className="rounded-xl bg-(--pc-paper) px-2 py-1.5 text-center">
      <p className="text-[10px] text-(--pc-faint)">{label}</p>
      <p className="font-sans text-sm font-bold" style={{ color: color ?? "var(--pc-ink)" }}>
        {value}
      </p>
    </div>
  );
}

/** 卡片视图（按 MOD 分组） */
export function MapCardView({
  groups,
  commentsByMap,
  category,
  season,
  settings,
  selectedIds,
  onToggleSelect,
  actions,
}: {
  groups: { mod: string; items: MapSelection[] }[];
  commentsByMap: Record<string, MapComment[]>;
  category: string;
  season: string;
  settings: Settings | null;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  actions: MapViewActions;
}) {
  return (
    <div className="mt-4 flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.mod}>
          <div className="mb-3 flex items-center gap-3">
            <span
              className="rounded-xl px-3 py-1 text-sm font-bold text-white shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: MOD_COLORS[g.mod] ?? "#666" }}
            >
              {MOD_DISPLAY[g.mod] ?? g.mod}
            </span>
            <span className="text-xs text-(--pc-slate)">{g.items.length} 张图</span>
            {(() => {
              const s = groupStats(g.items);
              return (
                <HoverCard openDelay={150} closeDelay={0}>
                  <HoverCardTrigger asChild>
                    <span className="ml-auto flex cursor-help flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--pc-slate)">
                      <span>
                        ★ <b className="font-bold text-pc-primary">{fmt(s.avgStar)}</b>
                      </span>
                      <span>长度 {s.avgLen}s</span>
                      <span>BPM {fmt(s.avgBpm)}</span>
                      <span className="text-pc-yellow">T {s.testing}</span>
                      <span className="text-pc-blue">P {s.pending}</span>
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" align="end" className="w-auto p-3">
                    <ModStatCard mod={g.mod} items={g.items} />
                  </HoverCardContent>
                </HoverCard>
              );
            })()}
          </div>
          <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[1400px]:grid-cols-3 2xl:grid-cols-4">
            {g.items.map((m) => {
              const comments = commentsByMap[String(m.id)] ?? [];
              const modColor = MOD_COLORS[modBase(m)] ?? "#666";
              return (
                <MapContextMenu key={m.id} map={m} actions={actions} compact>
                  <Card
                    className={cn("group relative overflow-hidden p-0", m.approved && "border-l-8")}
                    style={m.approved ? { borderLeftColor: "var(--pc-teal)" } : undefined}
                  >
                    {/* Cover strip */}
                    <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-pc-teal/40 to-pc-blue/40">
                      {m.coverUrl && (
                        <img src={m.coverUrl} alt="" className="h-full w-full object-cover" />
                      )}
                      {m.approved && (
                        <span className="absolute right-3 top-2 rounded-lg bg-pc-teal/90 px-2 py-0.5 text-xs font-bold text-pc-cream">
                          过审
                        </span>
                      )}
                      {m.padding && (
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-[#e0a47e]/90 px-2 py-0.5 text-xs font-bold text-(--pc-ink)">
                          <CircleArrowRight className="h-3.5 w-3.5" />
                          测图中
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                            style={{ backgroundColor: modColor }}
                          >
                            {`${modBase(m)}${m.modPosition ?? ""}`}
                          </span>
                          {m.customModName && (
                            <span className="text-xs font-bold text-(--pc-slate)">
                              {m.customModName}
                            </span>
                          )}
                          {m.selectedMods?.toUpperCase() === "DT" && m.customDTRate != null && (
                            <span className="text-xs font-bold text-[#a78bfa]">
                              x{Number(m.customDTRate).toFixed(2)}
                            </span>
                          )}
                          {category === "全部" && m.category && (
                            <Badge variant="outline">
                              {CATEGORY_LABEL[m.category] ?? m.category}
                            </Badge>
                          )}
                          {season === "" && m.season && (
                            <Badge variant="outline">{seasonLabel(settings, m.season)}</Badge>
                          )}
                          {m.isOrigin && <Badge variant="blue">原创</Badge>}
                          {m.isCustome && <Badge variant="yellow">定制</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!m.approved && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() => onToggleSelect(m.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onToggleSelect(m.id);
                                }
                              }}
                              title="批量选择"
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
                            >
                              <Checkbox
                                checked={selectedIds.has(m.id)}
                                className="pointer-events-none"
                              />
                            </span>
                          )}
                          <HoverCard openDelay={0} closeDelay={0}>
                            <HoverCardTrigger asChild>
                              <a
                                href={sayobotUrl(m)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Sayobot 下载"
                                className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </HoverCardTrigger>
                            <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                              <p className="text-xs font-bold text-(--pc-ink)">Sayobot 下载</p>
                            </HoverCardContent>
                          </HoverCard>
                          <HoverCard openDelay={0} closeDelay={0}>
                            <HoverCardTrigger asChild>
                              <a
                                href={osuMapUrl(m)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="打开 osu beatmap web"
                                className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
                              >
                                <Globe className="h-3.5 w-3.5" />
                              </a>
                            </HoverCardTrigger>
                            <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                              <p className="text-xs font-bold text-(--pc-ink)">
                                打开 osu beatmap web 查看
                              </p>
                            </HoverCardContent>
                          </HoverCard>
                          <HoverCard openDelay={0} closeDelay={0}>
                            <HoverCardTrigger asChild>
                              <a
                                href={`osu://b/${m.beatmapId}`}
                                aria-label={`osu direct 打开 ${m.beatmapId}`}
                                className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
                              >
                                <OsuIcon className="h-3.5 w-3.5" />
                              </a>
                            </HoverCardTrigger>
                            <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                              <p className="text-xs font-bold text-(--pc-ink)">
                                osu direct 打开（osu://b/{m.beatmapId}）
                              </p>
                            </HoverCardContent>
                          </HoverCard>
                          <HoverCard openDelay={0} closeDelay={0}>
                            <HoverCardTrigger asChild>
                              <button
                                onClick={() => actions.onCopyBid(m)}
                                title="复制 BID"
                                className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
                              >
                                <Clipboard className="h-3.5 w-3.5" />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                              <p className="text-xs font-bold text-(--pc-ink)">
                                BID:{" "}
                                <span className="font-mono text-pc-primary">{m.beatmapId}</span>
                              </p>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </div>

                      {/* Title */}
                      <p className="mt-2 line-clamp-2 font-bold text-(--pc-ink)">
                        {[m.artist_unicode || m.artist, m.title_unicode || m.title]
                          .filter(Boolean)
                          .join(" - ") || "未知曲目"}
                      </p>
                      <p className="text-xs text-(--pc-faint)">
                        [{m.version}] by {m.creator ?? "-"}
                      </p>

                      {/* Stats */}
                      <div className="mt-3 grid grid-cols-4 gap-1.5">
                        {statCell("CS", fmt(m.cs))}
                        {statCell("AR", fmt(m.ar))}
                        {statCell("OD", fmt(m.od))}
                        {statCell("HP", fmt(m.hp))}
                        {statCell("时长", fmtLength(m.totalLength))}
                        {statCell("MaxCombo", m.maxCombo != null ? String(m.maxCombo) : "-")}
                        {statCell("BPM", fmt(m.bpm))}
                        {statCell("★", fmt(m.starRating), starColor(m.starRating))}
                      </div>

                      {/* Nominator */}
                      <div className="mt-3 flex items-center gap-2">
                        {m.selectedByAvatar || osuAvatarUrl(m.selectedBy) ? (
                          <img
                            src={m.selectedByAvatar || osuAvatarUrl(m.selectedBy)}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="grid h-6 w-6 place-items-center rounded-full bg-pc-yellow/30 text-[10px] font-bold text-(--pc-ink)">
                            {(m.selectedByUsername || m.selectedBy || "?").slice(0, 1)}
                          </div>
                        )}
                        <span className="text-xs text-(--pc-slate)">
                          {m.selectedByUsername || m.selectedBy || "未知提名者"}
                        </span>
                        <HoverCard openDelay={0} closeDelay={0}>
                          <HoverCardTrigger asChild>
                            <button
                              onClick={() => actions.onComment(m)}
                              title="添加评论"
                              className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-(--pc-faint) transition hover:text-pc-primary"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent side="bottom" className="w-auto px-3 py-1.5">
                            <p className="text-xs font-bold text-(--pc-ink)">添加评论</p>
                          </HoverCardContent>
                        </HoverCard>
                      </div>

                      {/* Note */}
                      {m.comment && (
                        <p className="mt-2 rounded-lg bg-(--pc-paper) px-2 py-1 text-xs text-(--pc-faint)">
                          备注：{m.comment}
                        </p>
                      )}

                      {/* Comments preview */}
                      {comments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {comments.slice(0, 3).map((c) => (
                            <HoverCard key={c.id}>
                              <HoverCardTrigger asChild>
                                <button
                                  onClick={() => actions.onComment(m)}
                                  className="flex items-center gap-1.5 rounded-full border-2 border-(--pc-border) bg-(--pc-white) px-2 py-1 text-left transition hover:-translate-y-0.5"
                                >
                                  <UserAvatar
                                    username={c.username}
                                    avatarUrl={c.avatarUrl}
                                    osuId={c.userId}
                                    className="h-5 w-5"
                                    fallbackClassName="bg-pc-yellow/30 text-[8px] font-bold text-(--pc-ink)"
                                    uppercase
                                  />
                                  <span className="text-[10px] text-(--pc-slate)">
                                    {c.comment.slice(0, 12)}
                                    {c.comment.length > 12 ? "…" : ""}
                                  </span>
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-72">
                                <div className="flex items-center gap-2.5">
                                  <UserAvatar
                                    username={c.username}
                                    avatarUrl={c.avatarUrl}
                                    osuId={c.userId}
                                    className="h-10 w-10 rounded-xl"
                                    fallbackClassName="bg-pc-yellow/30 font-bold text-(--pc-ink)"
                                    uppercase
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm text-(--pc-ink)">
                                      {c.username}
                                    </p>
                                    <p className="text-xs text-(--pc-faint)">
                                      osuID: {c.userId}
                                      {c.createdAt ? ` · ${formatDateTime(c.createdAt)}` : ""}
                                    </p>
                                  </div>
                                </div>
                                <p className="mt-3 text-sm leading-relaxed text-(--pc-slate)">
                                  {c.comment}
                                </p>
                              </HoverCardContent>
                            </HoverCard>
                          ))}
                          {comments.length > 3 && (
                            <button
                              onClick={() => actions.onComment(m)}
                              className="grid h-7 w-7 place-items-center rounded-full bg-(--pc-paper) text-[10px] font-bold text-pc-primary"
                            >
                              +{comments.length - 3}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </MapContextMenu>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
