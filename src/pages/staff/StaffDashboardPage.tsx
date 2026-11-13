import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  DoorOpen,
  Gavel,
  History,
  LayoutDashboard,
  Map as MapIcon,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings,
  Swords,
  Users,
  Timer,
  UserCog,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { LoadingBlock } from "@/components/paper/feedback";
import { EmptyState } from "@/components/paper/paper";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import OverviewManagement from "@/components/staff/OverviewManagement";
import MatchScheduleManagement from "@/components/staff/MatchScheduleManagement";
import StreamingManagement from "@/components/staff/StreamingManagement";
import MapSelectionManagement from "@/components/staff/MapSelectionManagement";
import ReplayCollectionManagement from "@/components/staff/ReplayCollectionManagement";
import RoomManagement from "@/components/staff/RoomManagement";
import MatchupManagement from "@/components/staff/MatchupManagement";
import UserManagement from "@/components/staff/UserManagement";
import SettingsManagement from "@/components/staff/SettingsManagement";
import TaskScheduleManagement from "@/components/staff/TaskScheduleManagement";
import StaffListManagement from "@/components/staff/StaffListManagement";
import ContentManagement from "@/components/staff/ContentManagement";
import RefereeConsole from "@/components/staff/RefereeConsole";

const TABS = [
  { key: "overview", label: "概览", Icon: LayoutDashboard, Comp: OverviewManagement },
  { key: "mappool", label: "选图管理", Icon: MapIcon, Comp: MapSelectionManagement },
  { key: "replays", label: "回放收集", Icon: History, Comp: ReplayCollectionManagement },
  { key: "users", label: "用户管理", Icon: Users, Comp: UserManagement },
  { key: "matchups", label: "对战列表", Icon: Swords, Comp: MatchupManagement },
  { key: "rooms", label: "房间管理", Icon: DoorOpen, Comp: RoomManagement },
  { key: "referee", label: "裁判控制台", Icon: Gavel, Comp: RefereeConsole },
  { key: "schedules", label: "比赛预约管理", Icon: CalendarClock, Comp: MatchScheduleManagement },
  { key: "streaming", label: "房间加入", Icon: Radio, Comp: StreamingManagement },
  { key: "content", label: "内容管理", Icon: Newspaper, Comp: ContentManagement },
  { key: "settings", label: "系统设置", Icon: Settings, Comp: SettingsManagement },
  { key: "tasks", label: "计划任务", Icon: Timer, Comp: TaskScheduleManagement },
  { key: "stafflist", label: "工作人员", Icon: UserCog, Comp: StaffListManagement },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_MAP = new Map(TABS.map((t) => [t.key, t]));

/** 移动端顶部导航：概览 / 选图 / 回放 / 比赛管理 ▾ / 房间加入 / 内容管理 / 设置 */
const NAV: {
  key: string;
  label: string;
  Icon: typeof Swords;
  items?: TabKey[];
}[] = [
  { key: "overview", label: "概览", Icon: LayoutDashboard },
  { key: "mappool", label: "选图", Icon: MapIcon },
  { key: "replays", label: "回放", Icon: History },
  {
    key: "g-match",
    label: "比赛管理",
    Icon: Swords,
    items: ["schedules", "matchups", "rooms", "referee", "users"],
  },
  { key: "streaming", label: "房间加入", Icon: Radio },
  { key: "content", label: "内容管理", Icon: Newspaper },
  { key: "settings", label: "设置", Icon: Settings },
];

/** 桌面端侧边栏分组 */
const SIDEBAR_SECTIONS: { label?: string; items: TabKey[] }[] = [
  { items: ["overview", "mappool", "replays"] },
  { label: "比赛管理", items: ["schedules", "matchups", "rooms", "referee", "users"] },
  { items: ["streaming", "content", "stafflist", "tasks", "settings"] },
];

const TRIGGER_BASE =
  "border-2 shadow-[2px_2px_0px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:translate-y-0.5";
const TRIGGER_ACTIVE =
  "border-pc-primary bg-pc-primary text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)]";
const TRIGGER_IDLE = "border-(--pc-border) bg-(--pc-white) text-(--pc-ink)";

const STORAGE_KEY = "staff-dashboard-active-tab";

/** 侧边栏收起/展开开关（侧边栏内与内容区标题前各一个） */
function SidebarCollapseButton() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={toggleSidebar}
      title={open ? "收起侧边栏" : "展开侧边栏"}
      aria-label={open ? "收起侧边栏" : "展开侧边栏"}
    >
      {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
    </Button>
  );
}

export default function StaffDashboardPage() {
  const { user, permissions, loading } = useApp();
  const isAdmin = !!permissions?.isadmin && !!user;

  const [activeTab, setActiveTab] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || "overview",
  );
  const [navOpen, setNavOpen] = useState<string | null>(null);

  const selectTab = (key: string) => {
    setActiveTab(key);
    setNavOpen(null);
    localStorage.setItem(STORAGE_KEY, key);
  };

  const active = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const activeGroup = NAV.find((n) => n.items?.includes(active.key))?.key;

  if (loading) {
    return (
      <div className="min-h-screen bg-(--pc-paper)">
        <LoadingBlock label="加载会话中…" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-(--pc-paper)">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <EmptyState
            title="没有访问权限"
            action={
              <Button
                asChild
                className="rounded-xl bg-pc-teal px-5 py-2.5 text-sm font-bold text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
              >
                <Link to="/player-info">返回个人信息页</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const ActiveComp = active.Comp;

  return (
    <SidebarProvider className="bg-(--pc-paper)">
      {/* 桌面端：左侧边栏 */}
      <Sidebar side="left">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <SidebarCollapseButton />
          </div>
        </SidebarHeader>

        <SidebarContent>
          {SIDEBAR_SECTIONS.map((section, index) => (
            <div key={section.label ?? index}>
              {index > 0 && <SidebarSeparator />}
              <SidebarGroup>
                {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((key) => {
                      const t = TAB_MAP.get(key)!;
                      return (
                        <SidebarMenuItem key={key}>
                          <SidebarMenuButton
                            isActive={active.key === key}
                            onClick={() => selectTab(key)}
                            className={section.label ? "pl-4" : undefined}
                          >
                            <t.Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{t.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <Link
            to="/"
            className="flex h-9 items-center justify-center rounded-xl border-2 border-(--pc-border) bg-(--pc-white) text-xs font-bold text-(--pc-slate) transition-colors hover:border-pc-teal hover:text-pc-teal"
          >
            返回首页
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="w-full px-4 pt-8 pb-16 lg:px-8">
          {/* 桌面端：页面标题栏（标题前含侧边栏开关，收起后可再展开） */}
          <div className="mb-4 hidden items-center gap-2 lg:flex">
            <SidebarCollapseButton />
          </div>
          {/* 移动端：顶栏（无站点导航时的返回入口） */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Link
              to="/"
              className="text-xs font-bold text-(--pc-slate) underline underline-offset-4 hover:text-pc-primary"
            >
              返回首页
            </Link>
          </div>

          {/* 移动端：顶部导航菜单 */}
          <NavigationMenu
            value={navOpen}
            onValueChange={(v) => setNavOpen(v as string | null)}
            className="mb-4 lg:hidden"
          >
            <NavigationMenuList className="flex-wrap gap-2">
              {NAV.map((entry) => {
                if (!entry.items) {
                  const { Icon } = entry;
                  return (
                    <NavigationMenuItem key={entry.key}>
                      <button
                        type="button"
                        onClick={() => selectTab(entry.key)}
                        className={cn(
                          "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold whitespace-nowrap transition-all duration-200",
                          TRIGGER_BASE,
                          active.key === entry.key ? TRIGGER_ACTIVE : TRIGGER_IDLE,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {entry.label}
                      </button>
                    </NavigationMenuItem>
                  );
                }
                const { Icon } = entry;
                return (
                  <NavigationMenuItem key={entry.key} value={entry.key}>
                    <NavigationMenuTrigger
                      className={cn(
                        "whitespace-nowrap",
                        TRIGGER_BASE,
                        activeGroup === entry.key ? TRIGGER_ACTIVE : TRIGGER_IDLE,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {entry.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid w-56 gap-1 p-2">
                        {entry.items.map((key) => {
                          const t = TAB_MAP.get(key)!;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => selectTab(key)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors",
                                active.key === key
                                  ? "bg-pc-primary/10 text-pc-primary"
                                  : "text-(--pc-ink) hover:bg-pc-primary/10 hover:text-pc-primary",
                              )}
                            >
                              <t.Icon className="h-4 w-4 shrink-0" />
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <div key={activeTab}>
            <ActiveComp />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
