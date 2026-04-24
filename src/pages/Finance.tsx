import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Pencil,
  Trash2,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  CartesianGrid,
  Bar,
  BarChart,
  XAxis,
  YAxis,
} from "recharts";
import { TransactionDialog, Txn } from "@/components/finance/TransactionDialog";
import { BudgetDialog } from "@/components/finance/BudgetDialog";
import { BN_MONTHS, formatBnDateShort, toBn } from "@/lib/bangla";
import { StatCard } from "@/components/dashboard/StatCard";

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  month: string;
}

const fmtMoney = (n: number) => `৳ ${toBn(Math.round(n).toLocaleString("en-US"))}`;

const PIE_COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

const Finance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { monthStart, monthEnd, label } = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const fmt = (x: Date) =>
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    return {
      monthStart: fmt(start),
      monthEnd: fmt(end),
      label: `${BN_MONTHS[d.getMonth()]} ${toBn(d.getFullYear())}`,
    };
  }, [monthOffset]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: t }, { data: b }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,type,amount,category,note,transaction_date")
        .gte("transaction_date", monthStart)
        .lte("transaction_date", monthEnd)
        .order("transaction_date", { ascending: false }),
      supabase.from("budgets").select("id,category,monthly_limit,month").eq("month", monthStart),
    ]);
    setTxns((t as any) ?? []);
    setBudgets((b as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, monthStart]);

  const totals = useMemo(() => {
    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, balance: income - expense, savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0 };
  }, [txns]);

  // Expense by category for pie
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txns.filter((x) => x.type === "expense")) {
      map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [txns]);

  // Daily flow for bar chart
  const dailyFlow = useMemo(() => {
    const days = Number(monthEnd.slice(-2));
    const arr = Array.from({ length: days }, (_, i) => ({
      day: toBn(i + 1),
      income: 0,
      expense: 0,
    }));
    for (const t of txns) {
      const d = Number(t.transaction_date.slice(-2)) - 1;
      if (arr[d]) arr[d][t.type] += Number(t.amount);
    }
    return arr;
  }, [txns, monthEnd]);

  // Budgets with usage
  const budgetUsage = useMemo(() => {
    return budgets.map((b) => {
      const spent = txns
        .filter((t) => t.type === "expense" && t.category === b.category)
        .reduce((s, t) => s + Number(t.amount), 0);
      const pct = Math.min(100, Math.round((spent / Number(b.monthly_limit)) * 100));
      return { ...b, spent, pct };
    });
  }, [budgets, txns]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("transactions").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
    fetchData();
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">আর্থিক ব্যবস্থাপনা</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">অর্থ</h1>
            <p className="text-sm text-muted-foreground">আপনার আয়, ব্যয় এবং বাজেট এক জায়গায়</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1 shadow-soft">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((m) => m - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center text-sm font-medium">{label}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
                disabled={monthOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(true)} className="press">
              <Target className="mr-2 h-4 w-4" /> বাজেট
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="press shadow-glow bg-gradient-accent text-accent-foreground hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" /> নতুন লেনদেন
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="মোট আয়" value={fmtMoney(totals.income)} hint={label} icon={TrendingUp} accent="success" />
              <StatCard label="মোট ব্যয়" value={fmtMoney(totals.expense)} hint={label} icon={TrendingDown} accent="warning" />
              <StatCard
                label="ব্যালেন্স"
                value={fmtMoney(totals.balance)}
                hint={totals.balance >= 0 ? "ইতিবাচক" : "ঘাটতি"}
                icon={Wallet}
                accent={totals.balance >= 0 ? "primary" : "warning"}
              />
              <StatCard
                label="সঞ্চয় হার"
                value={`${toBn(Math.max(0, totals.savingsRate))}%`}
                hint="আয়ের অনুপাতে"
                icon={PiggyBank}
                accent="accent"
              />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 p-6 shadow-soft">
                <div className="mb-5">
                  <h3 className="text-base font-semibold">দৈনিক প্রবাহ</h3>
                  <p className="text-xs text-muted-foreground">আয় বনাম ব্যয়</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyFlow}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number, name: string) => [
                          fmtMoney(v),
                          name === "income" ? "আয়" : "ব্যয়",
                        ]}
                      />
                      <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 shadow-soft">
                <div className="mb-5">
                  <h3 className="text-base font-semibold">ব্যয় বিভাগ</h3>
                  <p className="text-xs text-muted-foreground">ক্যাটাগরি অনুযায়ী</p>
                </div>
                {expenseByCategory.length === 0 ? (
                  <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                    কোন ব্যয় নেই
                  </div>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseByCategory}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                          >
                            {expenseByCategory.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RTooltip
                            contentStyle={{
                              background: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            formatter={(v: number) => fmtMoney(v)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {expenseByCategory.slice(0, 5).map((c, i) => (
                        <li key={c.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            {c.name}
                          </span>
                          <span className="font-en text-muted-foreground">{fmtMoney(c.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </div>

            {/* Budgets */}
            <Card className="p-6 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">মাসিক বাজেট</h3>
                  <p className="text-xs text-muted-foreground">{label} এর জন্য সীমা</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setBudgetDialogOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> যোগ করুন
                </Button>
              </div>
              {budgetUsage.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">এখনো কোন বাজেট নেই</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {budgetUsage.map((b) => {
                    const over = b.spent > Number(b.monthly_limit);
                    return (
                      <div key={b.id} className="rounded-lg border border-border/60 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium">{b.category}</span>
                          <span className={`font-en text-xs ${over ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                            {fmtMoney(b.spent)} / {fmtMoney(Number(b.monthly_limit))}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${
                              over ? "bg-destructive" : b.pct > 80 ? "bg-warning" : "bg-success"
                            }`}
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          {over
                            ? `সীমা ছাড়িয়েছে ${fmtMoney(b.spent - Number(b.monthly_limit))}`
                            : `অবশিষ্ট ${fmtMoney(Number(b.monthly_limit) - b.spent)}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Transactions list */}
            <Card className="p-6 shadow-soft">
              <div className="mb-4">
                <h3 className="text-base font-semibold">সাম্প্রতিক লেনদেন</h3>
                <p className="text-xs text-muted-foreground">{toBn(txns.length)} টি লেনদেন</p>
              </div>
              {txns.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">এই মাসে কোন লেনদেন নেই</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {txns.map((t) => {
                    const isIncome = t.type === "income";
                    return (
                      <li key={t.id} className="flex items-center gap-3 py-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isIncome ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{t.category}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {formatBnDateShort(new Date(t.transaction_date))}
                            </Badge>
                          </div>
                          {t.note && <p className="truncate text-xs text-muted-foreground">{t.note}</p>}
                        </div>
                        <span
                          className={`font-en text-sm font-semibold ${
                            isIncome ? "text-success" : "text-destructive"
                          }`}
                        >
                          {isIncome ? "+" : "−"} {fmtMoney(Number(t.amount))}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditing(t);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        txn={editing}
        onSaved={fetchData}
      />
      <BudgetDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        monthStart={monthStart}
        onSaved={fetchData}
      />
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>লেনদেন মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>এই কাজটি ফিরিয়ে আনা যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              মুছুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Finance;
