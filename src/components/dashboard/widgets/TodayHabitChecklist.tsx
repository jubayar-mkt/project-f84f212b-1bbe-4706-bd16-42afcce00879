import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toBn, toLocalDateStr } from "@/lib/bangla";
import { toast } from "sonner";

interface Habit { id: string; name: string; target_per_day: number; }
interface CI { habit_id: string; count: number; }

export const TodayHabitChecklist = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [ci, setCi] = useState<Record<string, number>>({});
  const today = toLocalDateStr(new Date());

  const load = async () => {
    if (!user) return;
    const [hR, cR] = await Promise.all([
      supabase.from("habits").select("id,name,target_per_day").eq("user_id", user.id).eq("active", true).order("created_at", { ascending: true }),
      supabase.from("habit_checkins").select("habit_id,count").eq("user_id", user.id).eq("checkin_date", today),
    ]);
    setHabits((hR.data ?? []) as Habit[]);
    const m: Record<string, number> = {};
    for (const c of (cR.data ?? []) as CI[]) m[c.habit_id] = c.count;
    setCi(m);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const tick = async (h: Habit) => {
    if (!user) return;
    const cur = ci[h.id] ?? 0;
    if (cur >= h.target_per_day) return;
    const next = cur + 1;
    setCi((p) => ({ ...p, [h.id]: next }));
    if (cur === 0) {
      const { error } = await supabase.from("habit_checkins").insert({ user_id: user.id, habit_id: h.id, checkin_date: today, count: 1 });
      if (error) { toast.error(error.message); load(); }
    } else {
      const { error } = await supabase.from("habit_checkins").update({ count: next }).eq("habit_id", h.id).eq("checkin_date", today);
      if (error) { toast.error(error.message); load(); }
    }
    if (next >= h.target_per_day) toast.success("লক্ষ্য পূরণ ✨");
  };

  return (
    <Card className="relative overflow-hidden p-6 shadow-soft glass">
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-warning/25 to-warning/5 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-warning to-warning/70">
              <Sparkles className="h-4 w-4 text-warning-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">আজকের অভ্যাস</h3>
              <p className="text-[11px] text-muted-foreground font-medium">checklist</p>
            </div>
          </div>
          <Link to="/habits" className="text-xs font-semibold text-accent hover:text-accent/80 hover:underline inline-flex items-center gap-1 transition-colors">
            সব <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0,1,2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : habits.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground font-medium">কোনো অভ্যাস যোগ করা নেই</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-auto no-scrollbar">
            {habits.map((h) => {
              const cur = ci[h.id] ?? 0;
              const done = cur >= h.target_per_day;
              return (
                <li key={h.id}>
                  <button
                    onClick={() => tick(h)}
                    disabled={done}
                    className={`press flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-smooth ${done ? "border-success/40 bg-success/15" : "border-border/60 bg-card/60 hover:border-accent/40 hover:bg-accent/10"}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${done ? "bg-success text-success-foreground" : "bg-muted text-foreground/70"}`}>
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold text-foreground ${done ? "line-through opacity-80" : ""}`}>{h.name}</p>
                      <p className="font-en text-[11px] text-muted-foreground font-medium">{toBn(cur)}/{toBn(h.target_per_day)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};