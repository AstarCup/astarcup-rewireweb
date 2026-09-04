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
        "rounded-2xl bg-white p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.08)]",
        className,
      )}
      style={
        {
          "--rdp-accent-color": "#e85d75",
          "--rdp-accent-background-color": "#fdf6ee",
          "--rdp-day_button-border-radius": "0.5rem",
          "--rdp-today-color": "#e85d75",
          "--rdp-day-height": "48px",
          "--rdp-day-width": "48px",
          "--rdp-day_button-height": "46px",
          "--rdp-day_button-width": "46px",
        } as React.CSSProperties
      }
      classNames={{
        caption_label: "font-bold text-[#2d2d2d]",
        weekday: "text-[#b0a898]",
        day_button:
          "rounded-lg text-[#2d2d2d] hover:bg-[#6b7fb5]/10 hover:text-[#2d2d2d] p-3",
        day_selected: "bg-[#e85d75] text-[#fdf6ee] hover:bg-[#e85d75] hover:text-[#fdf6ee]",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
