import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label="切换深色模式"
      className="grid h-9 w-9 place-items-center rounded-xl border-2 border-(--pc-border) bg-(--pc-white) text-(--pc-slate) shadow-[2px_2px_0px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:text-(--pc-ink)"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
