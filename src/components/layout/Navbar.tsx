import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, User, ShieldCheck } from "lucide-react";
import Logo from "./Logo";
import MessageCenter from "./MessageCenter";
import ThemeToggle from "./ThemeToggle";
import { useApp } from "@/lib/app-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "首页" },
  { to: "/news", label: "资讯" },
  { to: "/guide", label: "手册" },
  { to: "/schedule", label: "赛程" },
  { to: "/mappool", label: "图池" },
  { to: "/tools", label: "工具" },
  { to: "/registrations", label: "选手" },
  { to: "/photos", label: "历届" },
  { to: "/contact", label: "联系我们" },
];

export default function Navbar() {
  const { user, permissions, logout } = useApp();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/register");
  };

  return (
    <nav className="sticky top-0 z-40 border-b-2 border-(--pc-border) bg-(--pc-paper)/95 px-3 sm:px-4 md:px-6 lg:px-8 backdrop-blur-sm relative paper-texture">
      <div className="flex h-16 items-center justify-between gap-3 sm:gap-4 md:gap-6">
        <div className="flex items-center gap-2">
          {/* 移动端：图标改为菜单按钮，点击打开 Drawer */}
          <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
            <DrawerTrigger asChild>
              <button
                className="grid h-9 w-9 place-items-center rounded-xl bg-[#e85d75] text-[#fdf6ee] shadow-[2px_2px_0px_rgba(0,0,0,0.12)] rotate-[-2deg] transition-all duration-200 hover:-translate-y-0.5 md:hidden"
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>astracup</DrawerTitle>
                <DrawerDescription>导航菜单</DrawerDescription>
              </DrawerHeader>
              <div className="grid gap-1 overflow-y-auto px-4 pb-6">
                {LINKS.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === "/"}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "rounded-xl px-3 py-2.5 text-sm font-bold text-(--pc-slate) transition-all duration-200 hover:bg-(--pc-white) hover:text-(--pc-ink)",
                        isActive && "bg-(--pc-white) text-(--pc-ink) shadow-[2px_2px_0px_rgba(0,0,0,0.08)]",
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </DrawerContent>
          </Drawer>

          {/* 桌面端：显示品牌 Logo */}
          <Link
            to="/"
            aria-label="首页"
            className="hidden hover:-translate-y-0.5 transition-transform duration-200 md:block"
          >
            <Logo />
          </Link>
        </div>

        <div className="hidden items-center gap-0.5 md:flex lg:gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-2 py-2 text-sm font-bold text-(--pc-slate) transition-all duration-200 hover:-translate-y-0.5 hover:text-(--pc-ink) lg:px-3",
                  isActive && "bg-(--pc-white) text-(--pc-ink) shadow-[2px_2px_0px_rgba(0,0,0,0.08)]",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <>
              {permissions?.isadmin && (
                <Link
                  to="/staff-dashboard"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#5cb8a5] px-3 py-2 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-0.5 lg:px-4"
                  aria-label="管理后台"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden lg:inline">管理后台</span>
                </Link>
              )}
              <MessageCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-xl bg-(--pc-white) p-1 pr-2 shadow-[2px_2px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
                    aria-label="用户菜单"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-bold lg:inline">{user.username}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => navigate("/player-info")}>
                    <User className="h-4 w-4" /> 个人中心
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="h-4 w-4" /> 退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link
              to="/register"
              className="rounded-xl bg-[#e85d75] px-4 py-2.5 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)] sm:px-6"
            >
              登录<span className="hidden sm:inline"> / 报名</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}