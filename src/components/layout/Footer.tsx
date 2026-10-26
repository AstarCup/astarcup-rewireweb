import Logo from "./Logo";
import { Link } from "react-router-dom";
import { useApp } from "@/lib/app-context";
import { site } from "@/lib/site";

const INTERNAL_LINKS = [{ to: "/tools", label: "比赛工具" }];

const EXTERNAL_LINKS = [
  { label: "osu! 官网", href: site.urls.osu },
  { label: "g0v0 官网", href: site.urls.g0v0 },
  { label: "osu! Plus Plus", href: site.urls.oppRepo },
  { label: "QQ 群", href: site.contact.qqGroup },
  { label: "Bilibili", href: site.contact.bilibili },
];

export default function Footer() {
  const { settings } = useApp();
  const name = settings?.tournament_name || site.name;
  return (
    <footer className="border-t-2 border-(--pc-border) bg-(--pc-white) px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <Logo full />
          <p className="mt-2 max-w-xs text-xs text-(--pc-slate)">
            {site.tagline}
          </p>
        </div>
        <div>
          <h4 className="text-xl font-bold text-(--pc-ink)">相关链接</h4>
          <ul className="mt-2 space-y-1.5 text-xs text-(--pc-slate)">
            {INTERNAL_LINKS.map((l) => (
              <li key={l.to}>
                <Link className="transition-colors hover:text-pc-primary" to={l.to}>
                  {l.label}
                </Link>
              </li>
            ))}
            {EXTERNAL_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  className="transition-colors hover:text-pc-primary"
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
        © {site.footer.sinceYear} - {new Date().getFullYear()} {name} · {site.footer.icp} · {site.footer.police}
      </div>
    </footer>
  );
}
