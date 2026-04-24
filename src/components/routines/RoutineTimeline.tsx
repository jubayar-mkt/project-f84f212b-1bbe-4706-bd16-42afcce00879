import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Pencil, Trash2, AlertTriangle, CheckCircle2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatBnTime, toBn, toLocalDateStr } from "@/lib/bangla";
import type { Routine } from "./RoutineItem";

/* ---------------- Time helpers ---------------- */

const HOUR_HEIGHT = 64; // px per hour
const DAY_START_HOUR = 5; // 5 AM
const DAY_END_HOUR = 24; // up to 12 AM (midnight)

const timeToMinutes = (t?: string | null): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const minutesToY = (mins: number) => {
  const adj = Math.max(DAY_START_HOUR * 60, Math.min(DAY_END_HOUR * 60, mins));
  return ((adj - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
};

const formatHourLabel = (hour: number) => {
  const h12 = hour % 12 || 12;
  const period = hour >= 12 && hour < 24 ? "PM" : "AM";
  return `${toBn(h12)} ${period}`;
};

/* ---------------- Color palette per category/priority ---------------- */

const BLOCK_COLORS = [
  { from: "from-accent/30", to: "to-accent/10", text: "text-accent", ring: "ring-accent/40", dot: "bg-accent" },
  { from: "from-primary-glow/30", to: "to-primary-glow/10", text: "text-primary-glow", ring: "ring-primary-glow/40", dot: "bg-primary-glow" },
  { from: "from-warning/30", to: "to-warning/10", text: "text-warning", ring: "ring-warning/40", dot: "bg-warning" },
  { from: "from-success/30", to: "to-success/10", text: "text-success", ring: "ring-success/40", dot: "bg-success" },
  { from: "from-destructive/30", to: "to-destructive/10", text: "text-destructive", ring: "ring-destructive/40", dot: "bg-destructive" },
] as const;

const colorFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return BLOCK_COLORS[Math.abs(h) % BLOCK_COLORS.length];
};

/* ---------------- Layout: detect overlapping routines, lay out side-by-side ---------------- */

interface LaidOut {
  routine: Routine;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
  overlap: boolean;
}

const layoutRoutines = (routines: Routine[]): LaidOut[] => {
  const items = routines
    .map((r) => {
      const start = timeToMinutes(r.scheduled_time);
      let end = timeToMinutes(r.end_time);
      if (start == null) return null;
      if (end == null || end <= start) end = start + 30; // default 30min if missing/invalid
      return { routine: r, startMin: start, endMin: end };
    })
    .filter((x): x is { routine: Routine; startMin: number; endMin: number } => !!x)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  // Group into clusters of overlapping items
  const result: LaidOut[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    // Greedy column assignment
    const cols: number[] = []; // each entry = current end-min in that column
    const assigned = cluster.map((item) => {
      let placed = -1;
      for (let c = 0; c < cols.length; c++) {
        if (cols[c] <= item.startMin) {
          cols[c] = item.endMin;
          placed = c;
          break;
        }
      }
      if (placed === -1) {
        cols.push(item.endMin);
        placed = cols.length - 1;
      }
      return { ...item, col: placed };
    });
    const totalCols = cols.length;
    for (const a of assigned) {
      result.push({ ...a, cols: totalCols, overlap: totalCols > 1 });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of items) {
    if (cluster.length === 0 || it.startMin < clusterEnd) {
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.endMin);
    } else {
      flush();
      cluster.push(it);
      clusterEnd = it.endMin;
    }
  }
  flush();
  return result;
};

/* ---------------- Component ---------------- */

interface Props {
  routines: Routine[];
  date: Date;
  onToggle: (r: Routine) => void;
  onEdit: (r: Routine) => void;
  onDelete: (r: Routine) => void;
  onSkip?: (r: Routine) => void;
  /** Compact preview mode (no actions, smaller) */
  compact?: boolean;
}

export const RoutineTimeline = ({ routines, date, onToggle, onEdit, onDelete, onSkip, compact }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  // Live tick every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const isToday = toLocalDateStr(date) === toLocalDateStr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const laidOut = useMemo(() => layoutRoutines(routines), [routines]);

  // Find currently active routine (today only)
  const activeId = useMemo(() => {
    if (!isToday) return null;
    const a = laidOut.find((x) => nowMin >= x.startMin && nowMin < x.endMin);
    return a?.routine.id ?? null;
  }, [isToday, nowMin, laidOut]);

  // Auto-scroll to current time on mount/today
  useEffect(() => {
    if (!scrollRef.current || !isToday) return;
    const y = minutesToY(nowMin) - HOUR_HEIGHT * 1.5;
    scrollRef.current.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, routines.length]);

  const totalHours = DAY_END_HOUR - DAY_START_HOUR;
  const containerHeight = totalHours * HOUR_HEIGHT;

  const overlappingCount = laidOut.filter((x) => x.overlap).length;

  const unscheduled = routines.filter((r) => !r.scheduled_time);

  return (
    <div className="space-y-3">
      {overlappingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning animate-fade-in">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>
            {toBn(overlappingCount)} টি রুটিন একই সময়ে ওভারল্যাপ করছে — সময়সূচী পুনঃনির্ধারণ করুন
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "relative overflow-y-auto rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-accent/5 shadow-soft",
          compact ? "max-h-[420px]" : "max-h-[70vh]",
        )}
      >
        <div className="relative flex" style={{ height: containerHeight }}>
          {/* Hour labels */}
          <div className="sticky left-0 z-10 w-16 shrink-0 border-r border-border/40 bg-card/80 backdrop-blur-sm">
            {Array.from({ length: totalHours }, (_, i) => DAY_START_HOUR + i).map((hour) => (
              <div
                key={hour}
                className="relative flex items-start justify-end pr-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
                style={{ height: HOUR_HEIGHT }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {/* Timeline canvas */}
          <div className="relative flex-1">
            {/* Hour grid lines */}
            {Array.from({ length: totalHours }, (_, i) => i).map((i) => (
              <div
                key={i}
                className="border-t border-border/30"
                style={{ height: HOUR_HEIGHT }}
              >
                {/* half-hour subtle divider */}
                <div className="border-t border-dashed border-border/20" style={{ marginTop: HOUR_HEIGHT / 2 - 1 }} />
              </div>
            ))}

            {/* Current time line */}
            {isToday && nowMin >= DAY_START_HOUR * 60 && nowMin <= DAY_END_HOUR * 60 && (
              <div
                className="pointer-events-none absolute left-0 right-2 z-20 flex items-center"
                style={{ top: minutesToY(nowMin) - 1 }}
              >
                <div className="h-2.5 w-2.5 rounded-full bg-destructive shadow-glow" />
                <div className="h-[2px] flex-1 bg-gradient-to-r from-destructive via-destructive/70 to-transparent" />
              </div>
            )}

            {/* Routine blocks */}
            <div className="absolute inset-0 px-2">
              {laidOut.map((item) => {
                const top = minutesToY(item.startMin);
                const height = Math.max(28, minutesToY(item.endMin) - top);
                const widthPct = 100 / item.cols;
                const leftPct = item.col * widthPct;
                const c = colorFor(item.routine.category || item.routine.name);
                const isActive = item.routine.id === activeId;
                const completed = item.routine.completed;

                return (
                  <button
                    key={item.routine.id}
                    type="button"
                    onClick={() => onEdit(item.routine)}
                    className={cn(
                      "group absolute flex flex-col gap-1 overflow-hidden rounded-xl border border-border/40 p-2 text-left transition-all duration-200 animate-fade-in",
                      "bg-gradient-to-br shadow-soft hover:shadow-elevated hover:scale-[1.01] hover:z-10",
                      c.from,
                      c.to,
                      isActive && cn("ring-2 shadow-glow scale-[1.01] z-10", c.ring),
                      item.overlap && "ring-1 ring-warning/40",
                      completed && "opacity-50",
                    )}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 4px)`,
                      width: `calc(${widthPct}% - 8px)`,
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!compact && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={completed}
                            onCheckedChange={() => onToggle(item.routine)}
                            className="mt-0.5 h-4 w-4 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.dot)} />
                          <h4
                            className={cn(
                              "truncate text-xs font-semibold leading-tight",
                              completed && "line-through",
                              isActive && c.text,
                            )}
                          >
                            {item.routine.name}
                          </h4>
                          {isActive && (
                            <Badge className="h-4 shrink-0 bg-destructive/15 px-1.5 text-[9px] text-destructive border-0">
                              চলছে
                            </Badge>
                          )}
                        </div>
                        {height >= 44 && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            <span className="font-en">
                              {formatBnTime(item.routine.scheduled_time)}
                              {item.routine.end_time && (
                                <> – {formatBnTime(item.routine.end_time)}</>
                              )}
                            </span>
                          </div>
                        )}
                        {height >= 64 && item.routine.category && (
                          <Badge variant="outline" className="mt-1 h-4 px-1.5 text-[9px]">
                            {item.routine.category}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {!compact && height >= 60 && (
                      <div
                        className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-smooth group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onSkip && !item.routine.completed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="press h-6 w-6 rounded-md bg-card/60 backdrop-blur-sm text-warning"
                            onClick={() => onSkip(item.routine)}
                            aria-label="Skip today"
                            title="আজকের জন্য স্কিপ"
                          >
                            <SkipForward className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="press h-6 w-6 rounded-md bg-card/60 backdrop-blur-sm"
                          onClick={() => onEdit(item.routine)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="press h-6 w-6 rounded-md bg-card/60 backdrop-blur-sm text-destructive"
                          onClick={() => onDelete(item.routine)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unscheduled routines (no start time) */}
      {!compact && unscheduled.length > 0 && (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            সময় ছাড়া রুটিন ({toBn(unscheduled.length)})
          </p>
          <ul className="space-y-1.5">
            {unscheduled.map((r) => (
              <li
                key={r.id}
                className="group flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2"
              >
                <Checkbox
                  checked={r.completed}
                  onCheckedChange={() => onToggle(r)}
                  className="h-4 w-4 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
                <span
                  className={cn(
                    "flex-1 truncate text-sm",
                    r.completed && "line-through text-muted-foreground",
                  )}
                >
                  {r.name}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 press" onClick={() => onEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 press text-destructive"
                  onClick={() => onDelete(r)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {routines.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          এই দিনের জন্য কোনো রুটিন নেই
        </div>
      )}
    </div>
  );
};