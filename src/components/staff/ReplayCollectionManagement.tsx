import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { LoadingBlock, ErrorBlock } from "@/hooks/useFetch";
import { api, qs, blob, downloadBlob } from "@/lib/api";
import { SectionTitle } from "@/components/paper/paper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  seasonOptions as buildSeasonOptions,
  CATEGORY_OPTIONS,
  MODS_ORDER,
} from "@/lib/types";
import type { MapSelection } from "@/lib/types";
import { cn, fmt } from "@/lib/utils";

const MOD_COLORS: Record<string, string> = {
  NM: "#6b7fb5",
  HD: "#f5c040",
  HR: "#e85d75",
  DT: "#a78bfa",
  FM: "#5cb8a5",
  LZ: "#ec6ba8",
  TB: "#2d2d2d",
};

const MOD_DISPLAY: Record<string, string> = {
  NM: "No Mod",
  HD: "Hidden",
  HR: "Hard Rock",
  DT: "Double Time",
  FM: "Free Mod",
  LZ: "Lazer Mod",
  TB: "Tiebreaker",
};

function modBase(m: MapSelection): string {
  return (m.selectedMods ?? "NM").split("+")[0].toUpperCase() || "NM";
}

function starColor(s: number | null): string {
  const v = s ?? 0;
  if (v < 2) return "#4a90d9";
  if (v < 3.5) return "#5cb8a5";
  if (v < 5) return "#f5c040";
  if (v < 6.5) return "#e85d75";
  if (v < 8) return "#a78bfa";
  return "#7c3aed";
}

export default function ReplayCollectionManagement() {
  const { user, settings } = useApp();
  const seasonOptions = buildSeasonOptions(settings);
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("全部");
  const [modFilter, setModFilter] = useState("全部");
  const [maps, setMaps] = useState<MapSelection[]>([]);
  const [uploaded, setUploaded] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const curSeason = season || seasonOptions[seasonOptions.length - 1]?.value || "s1";

  // 默认直接选中最新赛季，不提供「最新赛季」占位选项
  useEffect(() => {
    if (season) return;
    const latest = seasonOptions[seasonOptions.length - 1]?.value;
    if (latest) setSeason(latest);
  }, [season, seasonOptions]);

  const loadPool = async () => {
    setLoading(true);
    const res = await api.get<MapSelection[]>(
      "/api/map-selections" +
        qs({
          season: curSeason,
          category: category === "全部" ? undefined : category,
          padding: true,
        }),
    );
    setLoading(false);
    if (res.ok) setMaps(res.data);
    else setError(res.error.message);
  };

  const loadUploaded = async () => {
    const res = await api.get<Record<string, string[]>>(
      "/api/replays/uploaded" +
        qs({
          season: curSeason,
          category: category === "全部" ? "all" : category,
        }),
    );
    if (res.ok) setUploaded(res.data);
  };

  useEffect(() => {
    void loadPool();
    void loadUploaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, category]);

  const filtered = useMemo(
    () => maps.filter((m) => modFilter === "全部" || modBase(m) === modFilter),
    [maps, modFilter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, MapSelection[]>();
    for (const m of filtered) {
      const key = modBase(m);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    const order = MODS_ORDER as readonly string[];
    return Array.from(map.keys())
      .sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
      .map((mod) => ({
        mod,
        items: map
          .get(mod)!
          .slice()
          .sort((a, b) => {
            const pa = Number(a.modPosition ?? 999);
            const pb = Number(b.modPosition ?? 999);
            return (Number.isNaN(pa) ? 999 : pa) - (Number.isNaN(pb) ? 999 : pb);
          }),
      }));
  }, [filtered]);

  const modOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of maps) {
      const k = modBase(m);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [
      { key: "全部", label: `全部 (${maps.length})` },
      ...Array.from(counts.entries()).map(([k, n]) => ({
        key: k,
        label: `${MOD_DISPLAY[k] ?? k} (${n})`,
      })),
    ];
  }, [maps]);

  const replayKey = (m: MapSelection) => {
    const s = m.season || curSeason;
    const c = m.category || (category === "全部" ? "qualification" : category);
    return `${s}/${c}/${m.beatmapId}`;
  };

  const buildFilename = (m: MapSelection) => {
    if (!user) return "";
    const s = m.season || curSeason;
    const c = m.category || (category === "全部" ? "qualification" : category);
    const safeUsername = (user.username || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${s}/${c}/${m.selectedMods ?? "NM"}${m.modPosition ?? ""}_${m.beatmapId}_${user.osuId}_${safeUsername}.osr`;
  };

  const uploadFor = (m: MapSelection, file: File) => {
    if (!user) {
      toast({ variant: "destructive", title: "请先登录" });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".osr")) {
      toast({ variant: "destructive", title: "请上传 .osr 回放文件" });
      return;
    }
    setBusy(m.id);
    void (async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("filename", buildFilename(m));
      fd.append("userId", user.osuId);
      const res = await api.post<{ url: string }>("/api/replays", fd, { json: false });
      setBusy(null);
      if (res.ok) {
        toast({ title: "上传成功" });
        setUploaded((prev) => {
          const key = replayKey(m);
          const list = prev[key] ?? [];
          return {
            ...prev,
            [key]: list.includes(user.username) ? list : [...list, user.username],
          };
        });
      } else {
        toast({ variant: "destructive", title: "上传失败" });
      }
    })();
  };

  const pickFile = (m: MapSelection) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".osr";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files?.[0]) uploadFor(m, target.files[0]);
    };
    input.click();
  };

  const deleteOwn = async (m: MapSelection) => {
    if (!user) return;
    setBusy(m.id);
    const res = await api.delete("/api/replays", {
      filename: buildFilename(m),
      userId: user.osuId,
    });
    setBusy(null);
    if (res.ok) {
      toast({ title: "已删除" });
      setUploaded((prev) => {
        const key = replayKey(m);
        return {
          ...prev,
          [key]: (prev[key] ?? []).filter((u) => u !== user.username),
        };
      });
    } else {
      toast({ variant: "destructive", title: "删除失败" });
    }
  };

  const downloadAll = async () => {
    setDownloading(true);
    try {
      const b = await blob(
        "/api/replays/archive" +
          qs({
            season: curSeason,
            category: category === "全部" ? "all" : category,
          }),
      );
      downloadBlob(b, `replays-${curSeason}-${category}.zip`);
      toast({ title: "已开始下载" });
    } catch {
      toast({ variant: "destructive", title: "下载失败" });
    }
    setDownloading(false);
  };

  return (
    <div>
      <SectionTitle tag="回放收集" accent="#6b7fb5">
        已上传回放
      </SectionTitle>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">赛季</Label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="最新" />
            </SelectTrigger>
            <SelectContent>
              {seasonOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">阶段</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-(--pc-faint)">MOD</Label>
          <Select value={modFilter} onValueChange={setModFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="teal" onClick={downloadAll} disabled={downloading}>
            {downloading ? "下载中…" : "下载全部回放"}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-(--pc-faint)">
        共 {maps.length} 张测图中选图 · 点击卡片或「上传回放」按钮选择 .osr 文件
      </p>

      {loading ? (
        <LoadingBlock label="加载图池…" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => void loadPool()} />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-(--pc-faint)">
          当前条件下没有测图中的选图。
        </p>
      ) : (
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
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {g.items.map((m) => {
                  const usernames = uploaded[replayKey(m)] ?? [];
                  const uploadedByMe = usernames.includes(user?.username ?? "");
                  return (
                    <Card
                      key={m.id}
                      className={cn("overflow-hidden p-0", usernames.length > 0 && "border-l-8")}
                      style={usernames.length > 0 ? { borderLeftColor: "#5cb8a5" } : undefined}
                    >
                      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-[#5cb8a5]/40 to-[#6b7fb5]/40">
                        {m.coverUrl && (
                          <img src={m.coverUrl} alt="" className="h-full w-full object-cover" />
                        )}
                        <span
                          className="absolute left-2 top-2 rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                          style={{ backgroundColor: MOD_COLORS[modBase(m)] ?? "#666" }}
                        >
                          {m.selectedMods ?? "NM"}
                          {m.modPosition ?? ""}
                        </span>
                      </div>
                      <div className="p-4">
                        <p className="line-clamp-2 font-bold text-(--pc-ink)">
                          {[m.artist, m.title].filter(Boolean).join(" - ") || "未知曲目"}
                        </p>
                        <p className="text-xs text-(--pc-faint)">
                          [{m.version}] by {m.creator ?? "-"}
                        </p>
                        <p className="mt-1 text-xs font-bold" style={{ color: starColor(m.starRating) }}>
                          ★ {fmt(m.starRating)}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {usernames.length === 0 ? (
                            <span className="text-xs text-(--pc-faint)">还没人上传</span>
                          ) : (
                            usernames.map((u) => (
                              <Badge key={u} variant={u === user?.username ? "teal" : "outline"}>
                                {u}
                              </Badge>
                            ))
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busy === m.id}
                            onClick={() => pickFile(m)}
                          >
                            {busy === m.id ? "上传中…" : "上传回放"}
                          </Button>
                          {uploadedByMe && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={busy === m.id}
                              onClick={() => void deleteOwn(m)}
                            >
                              删除
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
