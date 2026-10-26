/**
 * 站点级配置：所有对外域名、外链、联系方式集中在这里（构建期常量，不走 env）。
 * 需要换站点 / 换群 / 换备案号时只改这一处。
 */
export const site = {
  /** 站点名（`/api/settings` 的 tournament_name 缺失时兜底） */
  name: "Astracup",
  tagline: "星域来了，好急好急。",

  /** 外部站点与服务 */
  urls: {
    osu: "https://osu.ppy.sh",
    osuUser: (id: number | string) => `https://osu.ppy.sh/users/${id}`,
    osuBeatmap: (id: number | string) => `https://osu.ppy.sh/beatmaps/${id}`,
    osuBeatmapShort: (id: number | string) => `https://osu.ppy.sh/b/${id}`,
    osuAvatar: (id: number | string) => `https://a.ppy.sh/${id}`,

    g0v0: "https://lazer.g0v0.top/",
    g0v0Repo: "https://github.com/GooGuTeam/g0v0/",
    g0v0Avatar: (id: number | string) => `https://a.g0v0.top/${encodeURIComponent(String(id))}`,

    sayobot: (sid: number | string) => `https://dl.sayobot.cn/beatmaps/download/full/${sid}`,

    oppRepo: "https://github.com/osuplusplus/OPP",
    ez2lazerRepo: "https://github.com/SK-la/Ez2Lazer",
  },

  /** OPP 工具深链：opp://mappool/{tournament}?season=..&category=.. */
  opp: {
    scheme: "opp",
    tournament: "rino",
  },

  /** 联系方式 */
  contact: {
    qqGroup: "https://qm.qq.com/q/sFydxoQtaw",
    qqGroupNumber: "1072271422",
    bilibili: "https://space.bilibili.com/11872433",
    bilibiliLive: "https://live.bilibili.com/725565",
  },

  /** 页脚备案信息 */
  footer: {
    sinceYear: 2025,
    icp: "闽ICP备2026007493号-1",
    police: "闽公网安备35063002000143号",
  },
} as const;
