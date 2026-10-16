import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  DoorOpen,
  History,
  LayoutDashboard,
  Map,
  Radio,
  Settings,
  Swords,
  Users,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/paper/paper";
import { LoadingBlock } from "@/hooks/useFetch";
import { cn } from "@/lib/utils";
import OverviewManagement from "@/components/staff/OverviewManagement";
import MatchScheduleManagement from "@/components/staff/MatchScheduleManagement";
import StreamingManagement from "@/components/staff/StreamingManagement";
import MapSelectionManagement from "@/components/staff/MapSelectionManagement";
import ReplayCollectionManagement from "@/components/staff/ReplayCollectionManagement";
import RoomManagement from "@/components/staff/RoomManagement";
import MatchupManagement from "@/components/staff/MatchupManagement";
import UserManagement from "@/components/staff/UserManagement";
import SettingsManagement from "@/components/staff/SettingsManagement";

const TABS = [
  { key: "overview", label: "概览", Icon: LayoutDashboard, Comp: OverviewManagement },
  { key: "mappool", label: "选图管理", Icon: Map, Comp: MapSelectionManagement },
  { key: "replays", label: "回放收集", Icon: History, Comp: ReplayCollectionManagement },
  { key: "users", label: "用户管理", Icon: Users, Comp: UserManagement },
  { key: "matchups", label: "对战列表", Icon: Swords, Comp: MatchupManagement },
  { key: "rooms", label: "房间管理", Icon: DoorOpen, Comp: RoomManagement },
  { key: "schedules", label: "比赛预约管理", Icon: CalendarClock, Comp: MatchScheduleManagement },
  { key: "streaming", label: "房间加入", Icon: Radio, Comp: StreamingManagement },
  { key: "settings", label: "系统设置", Icon: Settings, Comp: SettingsManagement },
] as const;

const STORAGE_KEY = "staff-dashboard-active-tab";

export default function StaffDashboardPage() {
  const { user, permissions, loading } = useApp();
  const isAdmin = !!permissions?.isadmin && !!user;

  const [activeTab, setActiveTab] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || "overview",
  );

  const selectTab = (key: string) => {
    setActiveTab(key);
    localStorage.setItem(STORAGE_KEY, key);
  };

  const active = TABS.find((t) => t.key === activeTab) ?? TABS[0];

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
        <PageHeader title="管理后台" subtitle="工作人员专用" />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-2xl bg-(--pc-white) p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="text-2xl font-bold text-pc-primary">没有访问权限</p>
            <p className="mt-3 text-sm text-(--pc-slate)">
              此页面为工作人员管理后台，仅管理员可访问。
            </p>
            <Link
              to="/player-info"
              className="mt-6 inline-block rounded-xl bg-pc-teal px-5 py-2.5 text-sm font-bold text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
            >
              返回个人信息页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ActiveComp = active.Comp;

  return (
    <div className="min-h-screen bg-(--pc-paper) pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        {/* Horizontal scrollable tab bar */}
        <div className="flex gap-2 overflow-x-auto pb-3 pt-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all duration-200",
                "hover:-translate-y-0.5 active:translate-y-0.5",
                activeTab === t.key
                  ? "border-pc-primary bg-pc-primary text-pc-cream shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
                  : "border-(--pc-border) bg-(--pc-white) text-(--pc-ink) shadow-[2px_2px_0px_rgba(0,0,0,0.06)]",
              )}
            >
              <t.Icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="rounded-2xl bg-(--pc-paper)" key={activeTab}>
          <ActiveComp />
        </div>
      </div>
    </div>
  );
}