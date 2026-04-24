import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pointer-events-auto rounded-2xl bg-gradient-to-br from-card via-card to-accent/5 border border-border/60 shadow-soft", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-sm font-semibold tracking-tight bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-8 w-8 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground border border-accent/20 transition-all hover:shadow-glow inline-flex items-center justify-center",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex mb-1",
        head_cell: "text-muted-foreground/70 rounded-md w-9 font-semibold text-[0.7rem] uppercase tracking-wider",
        row: "flex w-full mt-1.5",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/30 [&:has([aria-selected])]:bg-accent/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 p-0 font-medium rounded-lg transition-all duration-200 hover:bg-accent/15 hover:text-accent hover:scale-105 inline-flex items-center justify-center aria-selected:opacity-100",
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-br from-accent to-primary text-accent-foreground shadow-glow hover:from-accent hover:to-primary hover:text-accent-foreground hover:scale-105 focus:from-accent focus:to-primary focus:text-accent-foreground font-semibold",
        day_today: "ring-2 ring-accent/40 text-accent font-bold bg-accent/5",
        day_outside:
          "day-outside text-muted-foreground/40 aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground/30 line-through",
        day_range_middle: "aria-selected:bg-accent/15 aria-selected:text-accent rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
