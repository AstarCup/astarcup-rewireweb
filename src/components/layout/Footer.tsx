import Logo from "./Logo";
import { useApp } from "@/lib/app-context";

const EXTERNAL_LINKS = [
  { label: "osu! 官网", href: "https://osu.ppy.sh" },
  { label: "g0v0 官网", href: "https://lazer-api.g0v0.top" },
  { label: "QQ 群", href: "https://qm.qq.com/q/sFydxoQtaw" },
  { label: "Bilibili", href: "https://space.bilibili.com/11872433" },
];

export default function Footer() {
  const { settings } = useApp();
  const name = settings?.tournament_name || "Astracup";
  return (
    <footer className="border-t-2 border-(--pc-border) bg-(--pc-white) px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <Logo full />
          <p className="mt-2 max-w-xs text-xs text-(--pc-slate)">
            一场由 osu! 社区玩家共同举办的赛事。
          </p>
        </div>
        <div>
          <h4 className="text-xl font-bold text-(--pc-ink)">相关链接</h4>
          <ul className="mt-2 space-y-1.5 text-xs text-(--pc-slate)">
            {EXTERNAL_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  className="transition-colors hover:text-[#e85d75]"
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t-2 border-(--pc-border) pt-4 text-xs text-(--pc-faint)">
        © 2025 - {new Date().getFullYear()} {name} · 闽ICP备2026007493号-1 · 闽公网安备35063002000143号
      </div>
    </footer>
  );
}
