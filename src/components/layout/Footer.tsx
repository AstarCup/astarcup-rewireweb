import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useApp } from "@/lib/app-context";

export default function Footer() {
  const { settings } = useApp();
  const name = settings?.tournament_name || "Astracup";
  return (
    <footer className="border-t-2 border-[#e0d8cc] bg-white px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <Logo />

        </div>
        <div>
          <h4 className="text-xl font-bold text-[#2d2d2d]">赛事</h4>
          <ul className="mt-2 space-y-1.5 text-xs text-[#666666]">
            <li>
              <Link className="hover:text-[#e85d75]" to="/guide">比赛手册</Link>
            </li>
            <li>
              <Link className="hover:text-[#e85d75]" to="/schedule">赛程安排</Link>
            </li>
            <li>
              <Link className="hover:text-[#e85d75]" to="/mappool">图池</Link>
            </li>
            <li>
              <Link className="hover:text-[#e85d75]" to="/photos">历届风采</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-xl font-bold text-[#2d2d2d]">关于</h4>
          <ul className="mt-2 space-y-1.5 text-xs text-[#666666]">
            <li>
              <Link className="hover:text-[#e85d75]" to="/contact">联络我们</Link>
            </li>
            <li>
              <Link className="hover:text-[#e85d75]" to="/registrations">参赛选手</Link>
            </li>
            <li>
              <Link className="hover:text-[#e85d75]" to="/obs-overlay">OBS 直播用面板</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t-2 border-[#e0d8cc] pt-4 text-xs text-[#b0a898]">
        © {new Date().getFullYear()} {name} · 闽ICP备2026007493号-1 · 闽公网安备35063002000143号
      </div>
    </footer>
  );
}