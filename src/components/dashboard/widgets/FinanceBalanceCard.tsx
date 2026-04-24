import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toBn } from "@/lib/bangla";

const fmtMoney = (n: number) => `৳ ${toBn(Math.round(n).toLocaleString("en-US"))}`;

export const FinanceBalanceCard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);

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
      setIncome(t.filter((x) => x.type === "income").reduce((s, x) => s + Number(x.amount), 0));
      setExpense(t.filter((x) => x.type === "expense").reduce((s, x) => s + Number(x.amount), 0));
      setLoading(false);
    })();
  }, [user]);

  const balance = income - expense;
  const positive = balance >= 0;

  return (
    <div className="block">
      <Card className="relative h-full overflow-hidden p-5 shadow-soft glass">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-primary opacity-20 blur-2xl" />
        <div className="relative space-y-3">
          <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Wallet className="h-4 w-4 text-primary-foreground" />
              </div>
              <p className="text-xs font-semibold text-foreground/80">এ মাসের ব্যালেন্স</p>
          </div>
          {loading ? (
            <Skeleton className="h-14 w-full rounded-md" />
          ) : (
            <>
              <p className={`font-en text-2xl font-bold tracking-tight ${positive ? "text-foreground" : "text-destructive"}`}>
                {fmtMoney(balance)}
              </p>
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="text-success font-semibold">+{fmtMoney(income)}</span>
                <span className="text-destructive font-semibold">−{fmtMoney(expense)}</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};