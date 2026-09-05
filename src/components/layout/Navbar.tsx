import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, User, ShieldCheck } from "lucide-react";
import Logo from "./Logo";
import MessageCenter from "./MessageCenter";
import { useApp } from "@/lib/app-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  { to: "/registrations", label: "选手" },
  { to: "/photos", label: "历届" },
  { to: "/contact", label: "联系我们" },
];

export default function Navbar() {
  const { user, permissions, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/register");
  };

  return (
    <nav className="sticky top-0 z-40 border-b-2 border-[#e0d8cc] bg-[#fdf6ee]/95 px-4 md:px-8 backdrop-blur-sm relative paper-texture">
      <div className="flex h-16 items-center justify-between gap-6">
        <Link to="/" aria-label="首页" className="hover:-translate-y-0.5 transition-transform duration-200">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-3 py-2 text-sm font-bold text-[#666666] transition-all duration-200 hover:-translate-y-0.5 hover:text-[#2d2d2d]",
                  isActive && "bg-white text-[#2d2d2d] shadow-[2px_2px_0px_rgba(0,0,0,0.08)]",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {permissions?.isadmin && (
                <Link
                  to="/staff-dashboard"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#5cb8a5] px-4 py-2 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-0.5"
                >
                  <ShieldCheck className="h-4 w-4" />
                  管理后台
                </Link>
              )}
              <MessageCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-xl bg-white p-1 pr-2 shadow-[2px_2px_0px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
                    aria-label="用户菜单"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-bold sm:inline">{user.username}</span>
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
              className="rounded-xl bg-[#e85d75] px-6 py-2.5 text-sm font-bold text-[#fdf6ee] shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]"
            >
              登录 / 报名
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}