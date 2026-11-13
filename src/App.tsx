import { lazy, Suspense, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import ScrollToTop from "@/components/layout/ScrollToTop";
import PageTransition from "@/components/layout/PageTransition";
import BackToTop from "@/components/layout/BackToTop";
import CursorToggle from "@/components/layout/CursorToggle";
import OsuCursor from "@/components/effects/OsuCursor";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// 路由级代码分割：页面按需加载，首屏只保留布局与当前页面
const HomePage = lazy(() => import("@/pages/HomePage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const PlayerInfoPage = lazy(() => import("@/pages/PlayerInfoPage"));
const StaffDashboardPage = lazy(() => import("@/pages/staff/StaffDashboardPage"));
const NewsPage = lazy(() => import("@/pages/NewsPage"));
const NewsDetailPage = lazy(() => import("@/pages/NewsDetailPage"));
const GuidePage = lazy(() => import("@/pages/GuidePage"));
const SchedulePage = lazy(() => import("@/pages/SchedulePage"));
const MappoolPage = lazy(() => import("@/pages/MappoolPage"));
const RegistrationsPage = lazy(() => import("@/pages/RegistrationsPage"));
const ToolsPage = lazy(() => import("@/pages/ToolsPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const PhotosPage = lazy(() => import("@/pages/PhotosPage"));
const BotBindPage = lazy(() => import("@/pages/BotBindPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <p className="text-sm text-(--pc-faint)">加载中…</p>
    </div>
  );
}

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-(--pc-paper) paper-texture">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <PageTransition />
      </main>
      <Footer />
    </div>
  );
}

const CURSOR_KEY = "osu-cursor-enabled";

/** 默认关闭自定义光标，用户主动打开后再记进 localStorage */
function readCursorEnabled(): boolean {
  try {
    return localStorage.getItem(CURSOR_KEY) === "true";
  } catch {
    return false;
  }
}

export default function App() {
  const [cursorEnabled, setCursorEnabled] = useState(readCursorEnabled);

  const toggleCursor = () => {
    setCursorEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CURSOR_KEY, String(next));
      } catch {
        /* 隐私模式下忽略 */
      }
      return next;
    });
  };

  return (
    <Toaster>
      <Routes>
        {/* 管理后台：不显示站点导航栏与页脚 */}
        <Route
          path="/staff-dashboard"
          element={
            <Suspense fallback={<PageFallback />}>
              <StaffDashboardPage />
            </Suspense>
          }
        />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/bind" element={<BotBindPage />} />
          <Route path="/player-info" element={<PlayerInfoPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/mappool" element={<MappoolPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <BackToTop />
      {/* 左下角开关：关掉后自定义光标和可点击元素指示框一起关闭 */}
      <CursorToggle enabled={cursorEnabled} onToggle={toggleCursor} />
      {/* osu!lazer 风格自定义光标：全站生效（含 staff 后台），触屏自动禁用 */}
      <OsuCursor enabled={cursorEnabled} />
    </Toaster>
  );
}
