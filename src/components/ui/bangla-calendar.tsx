import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BN_MONTHS, toBn, toLocalDateStr } from "@/lib/bangla";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEK_LABELS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

export interface DayDot {
  /** tailwind bg color class, e.g. "bg-accent" */
  className: string;
}

export interface BanglaCalendarProps {
  /** Currently selected date (YYYY-MM-DD or Date) */
  value?: Date | string | null;
  onChange?: (date: Date) => void;
  /** Map of YYYY-MM-DD -> array of dot indicators */
  events?: Record<string, DayDot[]>;
  /** Read-only mode: only highlights checkin dates from `events`, no selection */
  readOnly?: boolean;
  /** Initial month if uncontrolled (defaults to value's month or today) */
  initialMonth?: Date;
  /** External controlled month */
  month?: Date;
  onMonthChange?: (d: Date) => void;
  /** Show bottom action bar with "Clear" + "Today" */
  showActions?: boolean;
  onClear?: () => void;
  /** Compact size — used inside cards (smaller cells) */
  compact?: boolean;
  /** Optional accent color class for the selected pill (defaults to gradient) */
  accentClass?: string;
  className?: string;
}

const parseValue = (v?: Date | string | null): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Parse YYYY-MM-DD as local date (avoid TZ shift)
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const BanglaCalendar = ({
  value,
  onChange,
  events,
  readOnly = false,
  initialMonth,
  month: monthProp,
  onMonthChange,
  showActions = false,
  onClear,
  compact = false,
  accentClass,
  className,
}: BanglaCalendarProps) => {
  const selected = parseValue(value);
  const [internalMonth, setInternalMonth] = useState<Date>(
    initialMonth ?? selected ?? new Date(),
  );
  const month = monthProp ?? internalMonth;
  const setMonth = (d: Date) => {
    if (onMonthChange) onMonthChange(d);
    else setInternalMonth(d);
  };

  const [direction, setDirection] = useState<1 | -1>(1);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startWeekday = first.getDay();
    const total = last.getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [month]);

  const todayStr = toLocalDateStr(new Date());
  const selectedStr = selected ? toLocalDateStr(selected) : null;

  const shift = (n: number) => {
    setDirection(n > 0 ? 1 : -1);
    const d = new Date(month);
    d.setMonth(d.getMonth() + n);
    setMonth(d);
  };

  const goToday = () => {
    const t = new Date();
    setDirection(1);
    setMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    if (!readOnly) onChange?.(t);
  };

  const cellSize = compact ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-sm";
  const gap = compact ? "gap-1" : "gap-1.5";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 p-4 shadow-elevated",
        "bg-gradient-to-br from-card via-card to-accent/5",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-glow before:opacity-60",
        className,
      )}
    >
      <div className="relative">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => shift(-1)}
            className="press h-8 w-8 rounded-lg border border-accent/20 bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground hover:shadow-glow transition-smooth"
            aria-label="পূর্ববর্তী মাস"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-bold tracking-tight bg-gradient-to-r from-accent to-primary-glow bg-clip-text text-transparent">
              {BN_MONTHS[month.getMonth()]} {toBn(month.getFullYear())}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => shift(1)}
            className="press h-8 w-8 rounded-lg border border-accent/20 bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground hover:shadow-glow transition-smooth"
            aria-label="পরবর্তী মাস"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday labels */}
        <div className={cn("mb-1.5 grid grid-cols-7 text-center", gap)}>
          {WEEK_LABELS.map((d) => (
            <div
              key={d}
              className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div
          key={`${month.getFullYear()}-${month.getMonth()}`}
          className={cn(
            "grid grid-cols-7",
            gap,
            direction > 0 ? "animate-fade-in" : "animate-fade-in",
          )}
        >
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} className={cellSize} />;
            const ds = toLocalDateStr(d);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedStr;
            const dots = events?.[ds];

            return (
              <button
                key={ds}
                type="button"
                onClick={() => !readOnly && onChange?.(d)}
                disabled={readOnly}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl font-medium transition-all duration-200",
                  cellSize,
                  !readOnly && "active:scale-95 hover:scale-105 hover:shadow-soft",
                  !isSelected &&
                    "bg-muted/40 text-foreground hover:bg-accent/15 hover:text-accent",
                  isSelected &&
                    (accentClass
                      ? cn(accentClass, "text-white shadow-glow scale-105")
                      : "bg-gradient-to-br from-accent via-accent to-primary-glow text-accent-foreground shadow-glow scale-105 font-bold"),
                  !isSelected && isToday && "ring-2 ring-accent/50 ring-offset-1 ring-offset-card text-accent font-bold",
                  readOnly && "cursor-default",
                )}
                aria-label={ds}
                aria-pressed={isSelected}
              >
                <span className="font-en leading-none">{toBn(d.getDate())}</span>
                {dots && dots.length > 0 && (
                  <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                    {dots.slice(0, 3).map((dot, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isSelected ? "bg-white/80" : dot.className,
                        )}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        {showActions && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onClear?.()}
              className="press h-8 rounded-lg text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              পরিষ্কার করুন
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToday}
              className="press h-8 rounded-lg bg-accent/10 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-foreground hover:shadow-glow"
            >
              আজকের তারিখ
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};