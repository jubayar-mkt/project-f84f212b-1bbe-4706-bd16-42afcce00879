import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ArrowRight, Target, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toBn, toLocalDateStr } from "@/lib/bangla";

interface Row {
  scheduled_date: string;
  completed: boolean;
}

export const RoutineAnalyticsPreview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const { data } = await supabase
        .from("routines")
        .select("scheduled_date,completed")
        .gte("scheduled_date", toLocalDateStr(since));
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  // Build last 7 days bars
  const days: { label: string; rate: number; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = toLocalDateStr(d);
    const dayRows = rows.filter((r) => r.scheduled_date === ds);
    const done = dayRows.filter((r) => r.completed).length;
    const rate = dayRows.length ? Math.round((done / dayRows.length) * 100) : 0;
    days.push({ label: String(d.getDate()), rate, total: dayRows.length });
  }

  const total = rows.length;
  const completed = rows.filter((r) => r.completed).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  return (
    <Link to="/routine-analytics" className="group block">
      <Card className="relative overflow-hidden p-6 shadow-soft transition-spring hover:shadow-elevated hover:-translate-y-0.5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-accent opacity-15 blur-3xl group-hover:opacity-25 transition-opacity" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent shadow-glow">
                <Activity className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">রুটিন বিশ্লেষণ</h3>
                <p className="text-[10px] text-muted-foreground">গত ৭ দিনের productivity</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
          </div>

          {loading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : total === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              রুটিন যোগ করুন বিশ্লেষণ দেখতে
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-end gap-3">
                <p className="text-2xl font-bold font-en">{toBn(rate)}%</p>
                <p className="mb-1 text-xs text-muted-foreground">
                  {toBn(completed)}/{toBn(total)} সম্পন্ন
                </p>
              </div>
              <div className="flex h-12 items-end gap-1.5">
                {days.map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-accent transition-spring group-hover:from-accent/60"
                        style={{ height: `${Math.max(8, d.rate)}%`, opacity: d.total ? 1 : 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Target className="h-3 w-3" /> হার {toBn(rate)}%
                </span>
                <span className="flex items-center gap-1.5 text-warning">
                  <Flame className="h-3 w-3" /> {toBn(completed)} সম্পন্ন
                </span>
              </div>
            </>
          )}
        </div>
      </Card>
    </Link>
  );
};