/**
 * mod 选择器：已选 mod 列表（可调参数）+「添加 mod」弹出选择。
 * mod 种类与参数定义来自 src/data/OsuModsEntries.json，图标为 osu! 官方 mod 图标。
 */
import { useState } from "react";
import modsEntries from "@/data/OsuModsEntries.json";
import type { RefMod } from "@/lib/ref";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OsuModSetting {
  Name: string;
  Type: "number" | "boolean" | "enum";
  Label: string;
  Description?: string;
  Default: number | boolean | string;
  IsInteger?: boolean;
  DefaultPrecision?: number | null;
  EnumValues?: string[] | null;
}

interface OsuModEntry {
  Acronym: string;
  Name: string;
  Description: string;
  Type: string;
  Settings?: OsuModSetting[] | null;
}

const MODS = modsEntries as unknown as OsuModEntry[];
const BY_ACRONYM = new Map(MODS.map((m) => [m.Acronym, m]));

const GROUP_ORDER = [
  "DifficultyReduction",
  "DifficultyIncrease",
  "Conversion",
  "Automation",
  "Fun",
  "System",
];

const GROUP_LABEL: Record<string, string> = {
  DifficultyReduction: "减难",
  DifficultyIncrease: "增难",
  Conversion: "转换",
  Automation: "自动",
  Fun: "娱乐",
  System: "系统",
};

function defaultSettings(entry: OsuModEntry): Record<string, unknown> | undefined {
  const settings = entry.Settings ?? [];
  if (settings.length === 0) return undefined;
  return Object.fromEntries(settings.map((s) => [s.Name, s.Default]));
}

/** mod 官方图标（ppy/osu-resources 的 Mods 图标，已下载到 public/assets/osuModIcons） */
function modIconUrl(acronym: string): string | null {
  const entry = BY_ACRONYM.get(acronym);
  if (!entry) return null;
  const file = `mod-${entry.Name.toLowerCase().replace(/\s+/g, "-")}.png`;
  return `/assets/osuModIcons/${file}`;
}

/** 图标是白色字形：浅色底反色成黑，暗色底直接显示 */
export function ModIcon({
  acronym,
  className,
  onColor,
}: {
  acronym: string;
  className?: string;
  /** 背景是彩色/深色时为 true（图标保持白色） */
  onColor?: boolean;
}) {
  const url = modIconUrl(acronym);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className={cn(className ?? "h-3.5 w-auto", !onColor && "brightness-0 dark:invert")}
    />
  );
}

interface ModPickerProps {
  value: RefMod[];
  onChange: (mods: RefMod[]) => void;
}

/** 已选 mod 列表 + 内联展开的 mod 点选面板（不能用 Popover：模态 Dialog 的滚动锁会拦掉弹层滚轮） */
export default function ModPicker({ value, onChange }: ModPickerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const toggleMod = (acronym: string) => {
    const entry = BY_ACRONYM.get(acronym);
    if (!entry) return;
    if (value.some((m) => m.acronym === acronym)) {
      onChange(value.filter((m) => m.acronym !== acronym));
      return;
    }
    const settings = defaultSettings(entry);
    onChange([...value, settings ? { acronym, settings } : { acronym }]);
  };

  const setSetting = (acronym: string, name: string, v: unknown) => {
    onChange(
      value.map((m) =>
        m.acronym === acronym ? { ...m, settings: { ...(m.settings ?? {}), [name]: v } } : m,
      ),
    );
  };

  const removeMod = (acronym: string) => {
    onChange(value.filter((m) => m.acronym !== acronym));
  };

  return (
    <div className="grid gap-1.5">
      {/* 已选 mod 列表 */}
      {value.map((mod) => {
        const entry = BY_ACRONYM.get(mod.acronym);
        const settings = entry?.Settings ?? [];
        return (
          <div
            key={mod.acronym}
            className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-(--pc-border) bg-(--pc-white) px-2 py-1.5"
          >
            <ModIcon acronym={mod.acronym} className="h-3.5 w-auto" />
            <span className="text-[11px] font-bold text-(--pc-ink)">{mod.acronym}</span>
            {entry && (
              <span className="max-w-32 truncate text-[10px] text-(--pc-faint)">{entry.Name}</span>
            )}
            {settings.map((s) => {
              const cur = mod.settings?.[s.Name] ?? s.Default;
              return (
                <label
                  key={s.Name}
                  className="flex items-center gap-1 text-[10px] text-(--pc-slate)"
                  title={s.Description}
                >
                  <span>{s.Label}</span>
                  {s.Type === "boolean" ? (
                    <Checkbox
                      checked={!!cur}
                      onCheckedChange={(v) => setSetting(mod.acronym, s.Name, !!v)}
                    />
                  ) : s.Type === "enum" ? (
                    <Select
                      value={String(cur)}
                      onValueChange={(v) => setSetting(mod.acronym, s.Name, v)}
                    >
                      <SelectTrigger className="h-7 w-28 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(s.EnumValues ?? []).map((ev) => (
                          <SelectItem key={ev} value={ev}>
                            {ev}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      className="h-7 w-20 text-[10px]"
                      value={Number(cur)}
                      step={s.IsInteger ? 1 : Math.pow(10, -(s.DefaultPrecision ?? 2))}
                      onChange={(e) => setSetting(mod.acronym, s.Name, Number(e.target.value))}
                    />
                  )}
                </label>
              );
            })}
            <button
              type="button"
              className="ml-auto text-(--pc-faint) hover:text-pc-primary"
              onClick={() => removeMod(mod.acronym)}
              title={`移除 ${mod.acronym}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {/* 添加 mod：点击展开点选列表（在对话框内部，滚轮可正常滚动） */}
      <Button
        variant="outline"
        size="sm"
        className="justify-start"
        onClick={() => setAddOpen((v) => !v)}
      >
        <Plus className={cn("h-3.5 w-3.5 transition-transform", addOpen && "rotate-45")} /> 添加 mod
      </Button>
      {addOpen && (
        <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border-2 border-(--pc-border) bg-(--pc-paper) p-2">
          {GROUP_ORDER.map((group) => {
            const mods = MODS.filter((m) => m.Type === group);
            if (mods.length === 0) return null;
            return (
              <div key={group} className="grid gap-1">
                <p className="text-[10px] font-bold text-(--pc-faint)">
                  {GROUP_LABEL[group] ?? group}
                </p>
                <div className="flex flex-wrap gap-1">
                  {mods.map((m) => {
                    const on = value.some((v) => v.acronym === m.Acronym);
                    return (
                      <button
                        key={m.Acronym}
                        type="button"
                        title={`${m.Name} — ${m.Description}`}
                        onClick={() => toggleMod(m.Acronym)}
                        className={cn(
                          "flex items-center gap-1 rounded-lg border-2 px-1.5 py-0.5 text-[11px] font-bold transition-colors",
                          on
                            ? "border-pc-primary bg-pc-primary text-pc-cream"
                            : "border-(--pc-border) bg-(--pc-white) text-(--pc-ink) hover:border-pc-primary/50",
                        )}
                      >
                        <ModIcon acronym={m.Acronym} className="h-3 w-auto" onColor={on} />
                        {m.Acronym}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
