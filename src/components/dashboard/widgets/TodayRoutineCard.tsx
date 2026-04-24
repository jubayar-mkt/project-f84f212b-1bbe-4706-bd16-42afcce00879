import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowRight, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toBn, toLocalDateStr } from "@/lib/bangla";

export const TodayRoutineCard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [skipped, setSkipped] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = toLocalDateStr(new Date());
      const [tplR, cmpR] = await Promise.all([
        supabase.from("routine_templates").select("id").eq("user_id", user.id).is("archived_at", null).lte("effective_from", today),
        supabase.from("routine_completions").select("completed,skipped").eq("user_id", user.id).eq("completion_date", today),
      ]);
      const t = (tplR.data ?? []).length;
      const sk = (cmpR.data ?? []).filter((c: any) => c.skipped).length;
      const dn = (cmpR.data ?? []).filter((c: any) => c.completed).length;
      setTotal(t); setSkipped(sk); setDone(dn);
      setLoading(false);
    })();
  }, [user]);

  const eff = Math.max(0, total - skipped);
  const pct = eff ? Math.round((done / eff) * 100) : 0;

  return (
    <Link to="/routines" className="group block">
      <Card className="relative h-full overflow-hidden p-5 shadow-soft glass transition-spring hover:-translate-y-0.5 hover:shadow-elevated">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-accent opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" />
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent">
                <ListChecks className="h-4 w-4 text-accent-foreground" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">আজকের রুটিন</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          {loading ? (
            <Skeleton className="h-14 w-full rounded-md" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className="font-en text-2xl font-bold tracking-tight">{toBn(pct)}%</p>
                <p className="text-xs text-muted-foreground font-en">{toBn(done)}/{toBn(eff)}</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gradient-accent transition-spring" style={{ width: `${pct}%` }} />
              </div>
              {skipped > 0 && <p className="text-[10px] text-muted-foreground">{toBn(skipped)} টি স্কিপ</p>}
            </>
          )}
        </div>
      </Card>
    </Link>
  );
};