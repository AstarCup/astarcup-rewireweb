import { Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import ScrollToTop from "@/components/layout/ScrollToTop";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HomePage from "@/pages/HomePage";
import RegisterPage from "@/pages/RegisterPage";
import PlayerInfoPage from "@/pages/PlayerInfoPage";
import StaffDashboardPage from "@/pages/staff/StaffDashboardPage";
import NewsPage from "@/pages/NewsPage";
import NewsDetailPage from "@/pages/NewsDetailPage";
import GuidePage from "@/pages/GuidePage";
import SchedulePage from "@/pages/SchedulePage";
import MappoolPage from "@/pages/MappoolPage";
import RegistrationsPage from "@/pages/RegistrationsPage";
import ToolsPage from "@/pages/ToolsPage";
import ContactPage from "@/pages/ContactPage";
import PhotosPage from "@/pages/PhotosPage";
import BotBindPage from "@/pages/BotBindPage";
import NotFoundPage from "@/pages/NotFoundPage";

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-(--pc-paper) paper-texture">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster />
      <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/bind" element={<BotBindPage />} />
        <Route path="/player-info" element={<PlayerInfoPage />} />
        <Route path="/staff-dashboard" element={<StaffDashboardPage />} />
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
    </>
  );
}