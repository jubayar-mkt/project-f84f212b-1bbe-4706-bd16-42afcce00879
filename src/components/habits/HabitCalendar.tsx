import { useMemo } from "react";
import { BN_MONTHS, toBn, toLocalDateStr } from "@/lib/bangla";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  checkinDates: Set<string>;
  month: Date;
  onMonthChange: (d: Date) => void;
  colorClass?: string;
}

const WEEK_LABELS = ["র", "সো", "ম", "বু", "বৃ", "শু", "শ"];

export const HabitCalendar = ({ checkinDates, month, onMonthChange, colorClass = "bg-accent" }: Props) => {
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startWeekday = first.getDay();
    const total = last.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const todayStr = toLocalDateStr(new Date());

  const shift = (n: number) => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + n);
    onMonthChange(d);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => shift(-1)} className="press h-7 w-7">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <p className="text-sm font-medium">
          {BN_MONTHS[month.getMonth()]} {toBn(month.getFullYear())}
        </p>
        <Button variant="ghost" size="icon" onClick={() => shift(1)} className="press h-7 w-7">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground mb-1.5">
        {WEEK_LABELS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = toLocalDateStr(d);
          const checked = checkinDates.has(ds);
          const isToday = ds === todayStr;
          return (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-smooth",
                checked
                  ? `${colorClass} text-white shadow-soft`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
                isToday && !checked && "ring-1 ring-accent"
              )}
              title={ds}
            >
              {toBn(d.getDate())}
            </div>
          );
        })}
      </div>
    </div>
  );
};