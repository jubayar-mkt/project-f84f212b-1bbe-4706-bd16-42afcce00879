import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toBn } from "@/lib/bangla";
import { cn } from "@/lib/utils";

/* ---------------- Helpers ---------------- */

// Parse 24h "HH:MM" -> { hour12, minute, period }
const parse24 = (v?: string | null) => {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return { hour12, minute: m, period };
};

const to24 = (hour12: number, minute: number, period: "AM" | "PM") => {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const formatBnTime12 = (v?: string | null) => {
  const p = parse24(v);
  if (!p) return null;
  return `${toBn(String(p.hour12).padStart(2, "0"))}:${toBn(String(p.minute).padStart(2, "0"))} ${p.period}`;
};

/* ---------------- Wheel Column ---------------- */

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5; // odd number → center is highlighted
const PADDING = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

interface WheelProps {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  ariaLabel: string;
}

const Wheel = ({ values, selected, onChange, format, ariaLabel }: WheelProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number | null>(null);
  const isProgrammatic = useRef(false);

  // Sync external -> scroll position
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = values.indexOf(selected);
    if (idx < 0) return;
    const target = idx * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 1) {
      isProgrammatic.current = true;
      el.scrollTo({ top: target, behavior: "smooth" });
      window.setTimeout(() => {
        isProgrammatic.current = false;
      }, 250);
    }
  }, [selected, values]);

  const handleScroll = () => {
    if (isProgrammatic.current) return;
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(values.length - 1, idx));
      const v = values[clamped];
      // Snap precisely
      const target = clamped * ITEM_HEIGHT;
      if (Math.abs(el.scrollTop - target) > 0.5) {
        isProgrammatic.current = true;
        el.scrollTo({ top: target, behavior: "smooth" });
        window.setTimeout(() => {
          isProgrammatic.current = false;
        }, 200);
      }
      if (v !== selected) onChange(v);
    }, 90);
  };

  return (
    <div
      className="relative flex-1"
      style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
      role="listbox"
      aria-label={ariaLabel}
    >
      {/* Top/bottom fade overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl"
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--card)) 0%, hsl(var(--card) / 0) 22%, hsl(var(--card) / 0) 78%, hsl(var(--card)) 100%)",
        }}
      />
      {/* Center highlight band */}
      <div
        className="pointer-events-none absolute left-1 right-1 z-0 rounded-xl bg-gradient-to-r from-accent/15 via-accent/25 to-accent/15 ring-1 ring-accent/30 shadow-glow"
        style={{
          top: PADDING,
          height: ITEM_HEIGHT,
        }}
      />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="no-scrollbar relative h-full overflow-y-scroll snap-y snap-mandatory overscroll-contain"
        style={{ paddingTop: PADDING, paddingBottom: PADDING }}
      >
        {values.map((v) => {
          const isSelected = v === selected;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                "snap-center flex w-full items-center justify-center font-en transition-all duration-200",
                isSelected
                  ? "scale-110 font-bold text-accent"
                  : "scale-90 text-muted-foreground/60 hover:text-foreground/80",
              )}
              style={{ height: ITEM_HEIGHT }}
              aria-selected={isSelected}
              role="option"
            >
              <span className={cn("text-base leading-none", isSelected && "drop-shadow-[0_0_8px_hsl(var(--accent)/0.6)]")}>
                {format ? format(v) : toBn(String(v).padStart(2, "0"))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- Picker Body ---------------- */

interface PickerProps {
  value?: string | null; // 24h "HH:MM"
  onChange: (v: string) => void;
  onClear?: () => void;
  onDone?: () => void;
  showActions?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59

export const BanglaTimePickerBody = ({ value, onChange, onClear, onDone, showActions = true }: PickerProps) => {
  const initial = parse24(value) ?? { hour12: 9, minute: 0, period: "AM" as const };
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);

  // External value sync
  useEffect(() => {
    const p = parse24(value);
    if (!p) return;
    setHour12(p.hour12);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  const emit = (h: number, m: number, p: "AM" | "PM") => onChange(to24(h, m, p));

  return (
    <div
      className={cn(
        "relative w-[280px] overflow-hidden rounded-2xl border border-border/60 p-4 shadow-elevated",
        "bg-gradient-to-br from-card via-card to-accent/5",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-glow before:opacity-60",
      )}
    >
      <div className="relative">
        {/* Wheels */}
        <div className="flex items-stretch gap-2">
          <Wheel
            values={HOURS}
            selected={hour12}
            onChange={(v) => {
              setHour12(v);
              emit(v, minute, period);
            }}
            ariaLabel="ঘণ্টা"
          />
          <div className="flex flex-col items-center justify-center px-1 text-2xl font-bold text-accent/60">
            <span>:</span>
          </div>
          <Wheel
            values={MINUTES}
            selected={minute}
            onChange={(v) => {
              setMinute(v);
              emit(hour12, v, period);
            }}
            ariaLabel="মিনিট"
          />
        </div>

        {/* Labels */}
        <div className="mt-1 flex items-center gap-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <span className="flex-1">ঘণ্টা</span>
          <span className="w-3" />
          <span className="flex-1">মিনিট</span>
        </div>

        {/* AM/PM sliding pill toggle */}
        <div className="relative mt-3 grid grid-cols-2 gap-0 rounded-full border border-border/60 bg-muted/40 p-1">
          <span
            aria-hidden
            className={cn(
              "absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full transition-all duration-300 ease-out",
              "bg-gradient-to-br from-accent to-primary-glow shadow-glow",
              period === "PM" && "translate-x-[calc(100%+0.25rem)]",
            )}
          />
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriod(p);
                emit(hour12, minute, p);
              }}
              className={cn(
                "relative z-10 rounded-full py-1.5 text-xs font-bold tracking-wider transition-colors duration-200",
                period === p ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={period === p}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Actions */}
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
              size="sm"
              onClick={() => onDone?.()}
              className="press h-8 rounded-lg bg-gradient-accent text-xs font-semibold text-accent-foreground shadow-glow hover:opacity-90"
            >
              সম্পন্ন
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- Trigger + Popover ---------------- */

interface TriggerProps {
  value?: string | null; // 24h
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export const BanglaTimePicker = ({
  value,
  onChange,
  placeholder = "সময় নির্বাচন করুন",
  className,
  id,
  disabled,
  allowClear = true,
}: TriggerProps) => {
  const [open, setOpen] = useState(false);
  const display = formatBnTime12(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 text-left font-normal h-10 rounded-lg border-input bg-background hover:bg-accent/5 hover:border-accent/40 transition-smooth",
            !display && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-accent" />
          <span className="truncate">{display ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-none bg-transparent shadow-none pointer-events-auto"
        align="start"
        sideOffset={8}
      >
        <BanglaTimePickerBody
          value={value}
          onChange={onChange}
          onClear={
            allowClear
              ? () => {
                  onChange("");
                  setOpen(false);
                }
              : undefined
          }
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};