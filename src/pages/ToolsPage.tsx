import { Link } from "react-router-dom";
import { Check, ExternalLink, Gamepad2, Github, Home, Wrench } from "lucide-react";
import { PageHeader, PaperStack } from "@/components/paper/paper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ToolEntry {
  name: string;
  tag: string;
  role: string;
  desc: string;
  intro: string[];
  usage: string;
  features: string[];
  href: string;
  site?: { label: string; href: string };
  color: string;
  icon: typeof Wrench;
}

const TOOLS: ToolEntry[] = [
  {
    name: "osu! Plus Plus",
    tag: "OPP",
    role: "图池",
    desc: "开源 osu! 工具箱",
    intro: [
      "OPP 是一个使用 Tauri、Rust 与 React 构建的跨平台 osu! 桌面工具，支持 Windows x64 与 Linux。",
    ],
    usage: "赛事图池页发布，并提供一键导入osu!lazer和创建收藏夹。",
    features: [
      "玩家资料与成绩，内置 pp calculator（支持多模式与 Mod），可根据本地索引查找相似谱面、基于最近成绩或 BP 生成推荐",
      "镜像批量下载、筛选队列与多镜像自动回退；管理 Stable 收藏夹、导入分享码并自动补齐缺失谱面；浏览、预览和导出本地谱面与 Skin（.osz / .osk）；Skin Workshop 可组合 Stable Skin 组件并安全保存为副本",
      "o!rdr 在线渲染与 Danser 本地回放渲染队列、tosu / tosu-lyrics 与 OBS 直播工作流，以及 Trainer 练习谱面生成、网易云音乐搜索、空间去重与占用统计等实用工具",
    ],
    href: "https://github.com/osuplusplus/OPP",
    color: "#6b7fb5",
    icon: Wrench,
  },
  {
    name: "g0v0 lazer",
    tag: "咕服客户端",
    role: "比赛客户端",
    desc: "咕服（g0v0）专用客户端",
    intro: [
      "g0v0 lazer 是面向 g0v0（咕服）私服的专用客户端，支持 ASIO 低延迟音频输出。",
    ],
    usage: "原生g0v0体验。",
    features: ["咕服专用客户端", "支持 ASIO 低延迟音频"],
    href: "https://github.com/GooGuTeam/g0v0/",
    site: { label: "g0v0 官网", href: "https://lazer.g0v0.top/" },
    color: "#5cb8a5",
    icon: Gamepad2,
  },
  {
    name: "Ez2Lazer",
    tag: "第三方客户端",
    role: "比赛客户端",
    desc: "支持 ASIO、强化 mania 的 osu!lazer 分支",
    intro: [
      "Ez2Lazer 是基于 osu!lazer 的第三方客户端分支，加入 ASIO 低延迟音频输出支持，并对 osu!mania 的表现做了强化，适合追求低延迟与类ez2on体验的玩家。",
    ],
    usage: "选手可选择 Ez2Lazer 参赛，获得更低的音频延迟表现。",
    features: ["ezSkin自定功能", "支持 ASIO 低延迟音频", "8000帧update draw游戏表现"],
    href: "https://github.com/SK-la/Ez2Lazer",
    color: "#a78bfa",
    icon: Gamepad2,
  },
];

export default function ToolsPage() {
  return (
    <div>
      <PageHeader
        title="比赛工具"
        accent="#6b7fb5"
        subtitle={
          <>
            本站比赛用到的三个开源项目：OPP 负责图池与赛程组织，Ez2Lazer 与 g0v0 lazer
            是选手的比赛客户端。点击项目标题或按钮可跳转到对应主页。
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
        {TOOLS.map((t, i) => {
          const Icon = t.icon;
          return (
            <PaperStack key={t.name} layers={i % 2 === 0 ? 2 : 3}>
              <div className="p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  <span
                    className="grid h-14 w-14 shrink-0 rotate-[-2deg] place-items-center rounded-2xl text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.12)]"
                    style={{ backgroundColor: t.color }}
                  >
                    <Icon className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={t.href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-2xl text-(--pc-ink) transition-colors hover:text-[#e85d75]"
                      >
                        {t.name}
                      </a>
                      <ExternalLink className="h-4 w-4 text-(--pc-faint)" />
                    </div>
                    <p className="mt-1 text-sm font-bold text-(--pc-slate)">{t.desc}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="blue">{t.tag}</Badge>
                      <Badge variant="outline">{t.role}</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {t.intro.map((p) => (
                    <p key={p} className="text-sm leading-relaxed text-(--pc-slate)">
                      {p}
                    </p>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border-2 border-(--pc-border) bg-(--pc-paper) p-4">
                  <p className="mt-1 text-sm text-(--pc-slate)">{t.usage}</p>
                </div>

                <ul className="mt-6 grid gap-2 sm:grid-cols-3">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 rounded-xl border-2 border-(--pc-border) bg-(--pc-white) px-3 py-2 text-xs font-bold text-(--pc-slate)"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: t.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button asChild variant="primary">
                    <a href={t.href} target="_blank" rel="noreferrer">
                      <Github className="h-4 w-4" />
                      查看源码
                    </a>
                  </Button>
                  {t.site && (
                    <Button asChild variant="outline">
                      <a href={t.site.href} target="_blank" rel="noreferrer">
                        访问 {t.site.label}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </PaperStack>
          );
        })}

        <div className="flex justify-center pt-4">
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="h-4 w-4" />
              回到首页
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
