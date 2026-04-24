import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BanglaCalendar } from "@/components/ui/bangla-calendar";
import { formatBnDate, toLocalDateStr } from "@/lib/bangla";
import { cn } from "@/lib/utils";

interface Props {
  /** YYYY-MM-DD string */
  value?: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

const parse = (s?: string | null) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const BanglaDatePicker = ({
  value,
  onChange,
  placeholder = "তারিখ নির্বাচন করুন",
  className,
  id,
  disabled,
  allowClear = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const date = parse(value ?? null);

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
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-accent" />
          {date ? (
            <span className="truncate">{formatBnDate(date)}</span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-none bg-transparent shadow-none pointer-events-auto"
        align="start"
        sideOffset={8}
      >
        <BanglaCalendar
          value={date}
          onChange={(d) => {
            onChange(toLocalDateStr(d));
            setOpen(false);
          }}
          showActions
          onClear={
            allowClear
              ? () => {
                  onChange("");
                  setOpen(false);
                }
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
};