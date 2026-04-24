import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Check, Pencil, Trash2, AlertTriangle, Plus } from "lucide-react";
import { calcStreak, calcLongestStreak, toBn, toLocalDateStr, daysBetween } from "@/lib/bangla";
import { HabitCalendar } from "./HabitCalendar";
import { cn } from "@/lib/utils";

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  color: string;
  target_per_day: number;
}

export interface CheckIn {
  habit_id: string;
  checkin_date: string;
  count: number;
}

const colorMap: Record<string, { bg: string; text: string; cal: string }> = {
  accent: { bg: "bg-accent/15", text: "text-accent", cal: "bg-accent" },
  primary: { bg: "bg-primary/15", text: "text-primary", cal: "bg-primary" },
  success: { bg: "bg-success/15", text: "text-success", cal: "bg-success" },
  warning: { bg: "bg-warning/15", text: "text-warning", cal: "bg-warning" },
  destructive: { bg: "bg-destructive/15", text: "text-destructive", cal: "bg-destructive" },
};

interface Props {
  habit: Habit;
  checkins: CheckIn[];
  onCheckIn: (h: Habit) => void;
  onUncheck: (h: Habit) => void;
  onEdit: (h: Habit) => void;
  onDelete: (h: Habit) => void;
}

export const HabitCard = ({ habit, checkins, onCheckIn, onUncheck, onEdit, onDelete }: Props) => {
  const [month, setMonth] = useState(new Date());
  const colors = colorMap[habit.color] ?? colorMap.accent;

  const habitCheckins = checkins.filter((c) => c.habit_id === habit.id);
  const dates = habitCheckins.map((c) => c.checkin_date);
  const dateSet = new Set(dates);
  const streak = calcStreak(dates);
  const longest = calcLongestStreak(dates);
  const todayStr = toLocalDateStr(new Date());
  const todayEntry = habitCheckins.find((c) => c.checkin_date === todayStr);
  const todayCount = todayEntry?.count ?? 0;
  const completedToday = todayCount >= habit.target_per_day;

  // Streak warning: had a streak but yesterday missed
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);
  const lastDate = dates.sort().reverse()[0];
  const showWarning =
    longest >= 3 &&
    !dateSet.has(todayStr) &&
    !dateSet.has(yesterdayStr) &&
    !!lastDate &&
    daysBetween(new Date(), new Date(lastDate)) >= 2;

  return (
    <Card className="group p-5 hover-lift shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", colors.bg)}>
            <Flame className={cn("h-5 w-5", colors.text)} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{habit.name}</h3>
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              {habit.category && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{habit.category}</Badge>}
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                লক্ষ্য: {toBn(habit.target_per_day)}/দিন
              </Badge>
            </div>
            {habit.description && <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{habit.description}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
          <Button variant="ghost" size="icon" className="h-7 w-7 press" onClick={() => onEdit(habit)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 press text-destructive" onClick={() => onDelete(habit)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">বর্তমান streak</p>
          <p className="font-en text-lg font-bold flex items-center justify-center gap-1">
            {toBn(streak)} <Flame className={cn("h-3.5 w-3.5", streak > 0 ? "text-warning" : "text-muted-foreground")} />
          </p>
        </div>
        <div className="text-center border-x border-border/60">
          <p className="text-[10px] text-muted-foreground">দীর্ঘতম</p>
          <p className="font-en text-lg font-bold">{toBn(longest)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">মোট দিন</p>
          <p className="font-en text-lg font-bold">{toBn(dates.length)}</p>
        </div>
      </div>

      {/* Streak warning */}
      {showWarning && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
          <p className="text-foreground/90">
            আপনার <span className="font-semibold">{toBn(longest)} দিনের</span> streak ভেঙে গেছে। আজই আবার শুরু করুন!
          </p>
        </div>
      )}

      {/* Today action */}
      <div className="mt-4 flex items-center gap-2">
        {completedToday ? (
          <Button onClick={() => onUncheck(habit)} variant="outline" className="press flex-1 border-success/40 text-success bg-success/5 hover:bg-success/10">
            <Check className="mr-2 h-4 w-4" /> আজ সম্পন্ন ({toBn(todayCount)}/{toBn(habit.target_per_day)})
          </Button>
        ) : (
          <Button onClick={() => onCheckIn(habit)} className={cn("press flex-1 text-white shadow-glow", colors.cal, "hover:opacity-90")}>
            {habit.target_per_day > 1 ? <Plus className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
            {habit.target_per_day > 1
              ? `Check-in (${toBn(todayCount)}/${toBn(habit.target_per_day)})`
              : "আজকের জন্য Check-in"}
          </Button>
        )}
      </div>

      {/* Calendar */}
      <div className="mt-5 border-t border-border/60 pt-4">
        <HabitCalendar checkinDates={dateSet} month={month} onMonthChange={setMonth} colorClass={colors.cal} />
      </div>
    </Card>
  );
};