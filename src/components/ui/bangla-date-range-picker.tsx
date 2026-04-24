import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BanglaCalendar } from "@/components/ui/bangla-calendar";
import { formatBnDateShort, toLocalDateStr } from "@/lib/bangla";
import { cn } from "@/lib/utils";

export interface DateRange {
  start: Date;
  end: Date;
}

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
  className?: string;
}

export const BanglaDateRangePicker = ({ value, onChange, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ start: Date | null; end: Date | null }>({
    start: value.start,
    end: value.end,
  });

  const handlePick = (d: Date) => {
    if (!draft.start || (draft.start && draft.end)) {
      setDraft({ start: d, end: null });
      return;
    }
    if (d < draft.start) {
      setDraft({ start: d, end: draft.start });
      onChange({ start: d, end: draft.start });
    } else {
      setDraft({ start: draft.start, end: d });
      onChange({ start: draft.start, end: d });
    }
    setTimeout(() => setOpen(false), 150);
  };

  // Build event dots for range visualization
  const events: Record<string, { className: string }[]> = {};
  const s = draft.start;
  const e = draft.end ?? draft.start;
  if (s) {
    const start = s < (e ?? s) ? s : (e ?? s);
    const end = s < (e ?? s) ? (e ?? s) : s;
    const cur = new Date(start);
    while (cur <= end) {
      events[toLocalDateStr(cur)] = [{ className: "bg-accent" }];
      cur.setDate(cur.getDate() + 1);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 gap-2 rounded-lg border-input bg-background hover:bg-accent/5 hover:border-accent/40 transition-smooth",
            className,
          )}
        >
          <CalendarRange className="h-4 w-4 shrink-0 text-accent" />
          <span className="text-xs font-medium">
            {formatBnDateShort(value.start)} — {formatBnDateShort(value.end)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-none bg-transparent shadow-none pointer-events-auto"
        align="end"
        sideOffset={8}
      >
        <BanglaCalendar
          value={draft.end ?? draft.start}
          onChange={handlePick}
          events={events}
        />
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {!draft.start || draft.end
            ? "শুরুর তারিখ নির্বাচন করুন"
            : "শেষের তারিখ নির্বাচন করুন"}
        </p>
      </PopoverContent>
    </Popover>
  );
};