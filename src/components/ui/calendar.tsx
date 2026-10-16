import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={zhCN}
      className={cn(
        "rounded-2xl bg-(--pc-white) p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.08)]",
        className,
      )}
      style={
        {
          "--rdp-accent-color": "var(--pc-primary)",
          "--rdp-accent-background-color": "var(--pc-cream)",
          "--rdp-day_button-border-radius": "0.5rem",
          "--rdp-today-color": "var(--pc-primary)",
          "--rdp-day-height": "48px",
          "--rdp-day-width": "48px",
          "--rdp-day_button-height": "46px",
          "--rdp-day_button-width": "46px",
        } as React.CSSProperties
      }
      classNames={{
        caption_label: "font-bold text-(--pc-ink)",
        weekday: "text-(--pc-faint)",
        day_button:
          "rounded-lg text-(--pc-ink) hover:bg-pc-blue/10 hover:text-(--pc-ink) p-3",
        day_selected: "bg-pc-primary text-pc-cream hover:bg-pc-primary hover:text-pc-cream",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
