import { useMemo } from "react";
import { BanglaCalendar } from "@/components/ui/bangla-calendar";

interface Props {
  checkinDates: Set<string>;
  month: Date;
  onMonthChange: (d: Date) => void;
  colorClass?: string;
}

export const HabitCalendar = ({ checkinDates, month, onMonthChange, colorClass = "bg-accent" }: Props) => {
  // Build event-dot map from check-in dates so each completed day gets a colored dot.
  const events = useMemo(() => {
    const map: Record<string, { className: string }[]> = {};
    checkinDates.forEach((d) => {
      map[d] = [{ className: colorClass }];
    });
    return map;
  }, [checkinDates, colorClass]);

  return (
    <BanglaCalendar
      readOnly
      compact
      month={month}
      onMonthChange={onMonthChange}
      events={events}
      className="border-border/40 shadow-soft"
    />
  );
};