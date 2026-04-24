import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toBn } from "@/lib/bangla";

/** Savings progress = savings rate (income-expense)/income for current month. Goal default 30%. */
export const SavingsGoalCard = ({ goal = 30 }: { goal?: number }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("transactions").select("type,amount")
        .eq("user_id", user.id).gte("transaction_date", start).lte("transaction_date", end);
      const t = (data ?? []) as { type: string; amount: number }[];
      const inc = t.filter((x) => x.type === "income").reduce((s, x) => s + Number(x.amount), 0);
      const exp = t.filter((x) => x.type === "expense").reduce((s, x) => s + Number(x.amount), 0);
      setRate(inc > 0 ? Math.max(0, Math.round(((inc - exp) / inc) * 100)) : 0);
      setLoading(false);
    })();
  }, [user]);

  const pct = Math.min(100, Math.round((rate / goal) * 100));

  return (
    <Card className="relative h-full overflow-hidden p-5 shadow-soft glass">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-success/30 to-success/5 opacity-60 blur-2xl" />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-success to-success/60">
            <PiggyBank className="h-4 w-4 text-success-foreground" />
          </div>
          <p className="text-xs font-semibold text-foreground/80">সঞ্চয় লক্ষ্য</p>
        </div>
        {loading ? (
          <Skeleton className="h-14 w-full rounded-md" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <p className="font-en text-2xl font-bold tracking-tight">{toBn(rate)}%</p>
              <p className="text-xs text-muted-foreground font-en font-medium">/ {toBn(goal)}%</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-to-r from-success to-success/70 transition-spring" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              {rate >= goal ? "🎉 লক্ষ্য পূরণ" : `${toBn(goal - rate)}% বাকি`}
            </p>
          </>
        )}
      </div>
    </Card>
  );
};