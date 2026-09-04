import { useState } from "react";
import { Link } from "react-router-dom";
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
  { key: "overview", label: "概览", Comp: OverviewManagement },
  { key: "schedules", label: "比赛预约管理", Comp: MatchScheduleManagement },
  { key: "streaming", label: "房间加入", Comp: StreamingManagement },
  { key: "mappool", label: "选图管理", Comp: MapSelectionManagement },
  { key: "replays", label: "回放收集", Comp: ReplayCollectionManagement },
  { key: "rooms", label: "房间管理", Comp: RoomManagement },
  { key: "matchups", label: "对战列表", Comp: MatchupManagement },
  { key: "users", label: "用户管理", Comp: UserManagement },
  { key: "settings", label: "系统设置", Comp: SettingsManagement },
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
      <div className="min-h-screen bg-[#fdf6ee]">
        <LoadingBlock label="加载会话中…" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#fdf6ee]">
        <PageHeader title="管理后台" subtitle="工作人员专用" />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-2xl bg-white p-8 text-center shadow-[4px_4px_0px_rgba(0,0,0,0.08)]">
            <p className="text-2xl font-bold text-[#e85d75]">没有访问权限</p>
            <p className="mt-3 text-sm text-[#666666]">
              此页面为工作人员管理后台，仅管理员可访问。
            </p>
            <Link
              to="/player-info"
              className="mt-6 inline-block rounded-xl bg-[#5cb8a5] px-5 py-2.5 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
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
    <div className="min-h-screen bg-[#fdf6ee] pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        {/* Horizontal scrollable tab bar */}
        <div className="flex gap-2 overflow-x-auto pb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={cn(
                "whitespace-nowrap rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all duration-200",
                "hover:-translate-y-0.5 active:translate-y-0.5",
                activeTab === t.key
                  ? "border-[#e85d75] bg-[#e85d75] text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"
                  : "border-[#e0d8cc] bg-white text-[#2d2d2d] shadow-[2px_2px_0px_rgba(0,0,0,0.06)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="rounded-2xl bg-[#fdf6ee]" key={activeTab}>
          <ActiveComp />
        </div>
      </div>
    </div>
  );
}