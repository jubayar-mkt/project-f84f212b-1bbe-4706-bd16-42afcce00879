import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calcStreak, toBn } from "@/lib/bangla";

export const HabitStreakCard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bestStreak, setBestStreak] = useState(0);
  const [activeHabits, setActiveHabits] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [hR, cR] = await Promise.all([
        supabase.from("habits").select("id").eq("user_id", user.id).eq("active", true),
        supabase.from("habit_checkins").select("habit_id,checkin_date").eq("user_id", user.id),
      ]);
      const habits = (hR.data ?? []) as { id: string }[];
      const checkins = (cR.data ?? []) as { habit_id: string; checkin_date: string }[];
      let best = 0;
      for (const h of habits) {
        const dates = checkins.filter((c) => c.habit_id === h.id).map((c) => c.checkin_date).sort().reverse();
        const s = calcStreak(dates);
        if (s > best) best = s;
      }
      setBestStreak(best);
      setActiveHabits(habits.length);
      setLoading(false);
    })();
  }, [user]);

  return (
    <Link to="/habits" className="group block">
      <Card className="relative h-full overflow-hidden p-5 shadow-soft glass transition-spring hover:-translate-y-0.5 hover:shadow-elevated">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-warning/30 to-warning/5 opacity-60 blur-2xl group-hover:opacity-80 transition-opacity" />
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-warning to-warning/60">
                <Flame className="h-4 w-4 text-warning-foreground" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">শ্রেষ্ঠ স্ট্রিক</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          {loading ? (
            <Skeleton className="h-14 w-full rounded-md" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className="font-en text-2xl font-bold tracking-tight">{toBn(bestStreak)}</p>
                <p className="text-xs text-muted-foreground">দিন</p>
              </div>
              <p className="text-[11px] text-muted-foreground">{toBn(activeHabits)} টি সক্রিয় অভ্যাস</p>
            </>
          )}
        </div>
      </Card>
    </Link>
  );
};