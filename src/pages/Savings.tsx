import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PiggyBank, Plus, MoreVertical, Pencil, Trash2, Target, Calendar,
  CheckCircle2, TrendingUp, Wallet, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { toBn, formatBnDate } from "@/lib/bangla";
import { SavingsGoalDialog, type SavingsGoal } from "@/components/savings/SavingsGoalDialog";
import { DepositDialog } from "@/components/savings/DepositDialog";

interface DepositRow {
  id: string;
  goal_id: string;
  amount: number;
  deposit_date: string;
  note: string | null;
}

const fmt = (n: number) => toBn(Math.round(n).toLocaleString("en-US"));

const COLOR_MAP: Record<string, { bg: string; ring: string; from: string; to: string }> = {
  success: { bg: "bg-success", ring: "ring-success/30", from: "from-success", to: "to-success/60" },
  primary: { bg: "bg-primary", ring: "ring-primary/30", from: "from-primary", to: "to-primary/60" },
  accent: { bg: "bg-accent", ring: "ring-accent/30", from: "from-accent", to: "to-accent/60" },
  destructive: { bg: "bg-destructive", ring: "ring-destructive/30", from: "from-destructive", to: "to-destructive/60" },
};

const Savings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [goalDialog, setGoalDialog] = useState<{ open: boolean; goal: SavingsGoal | null }>({ open: false, goal: null });
  const [depositDialog, setDepositDialog] = useState<{ open: boolean; goalId: string; goalName: string }>({
    open: false, goalId: "", goalName: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [g, d] = await Promise.all([
      supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("savings_deposits").select("*").eq("user_id", user.id).order("deposit_date", { ascending: false }),
    ]);
    if (g.error) toast.error(g.error.message);
    if (d.error) toast.error(d.error.message);
    setGoals((g.data ?? []) as SavingsGoal[]);
    setDeposits((d.data ?? []) as DepositRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const dep of deposits) {
      map.set(dep.goal_id, (map.get(dep.goal_id) ?? 0) + Number(dep.amount));
    }
    return map;
  }, [deposits]);

  const summary = useMemo(() => {
    const target = goals.reduce((s, g) => s + Number(g.target_amount), 0);
    const saved = deposits.reduce((s, d) => s + Number(d.amount), 0);
    const completed = goals.filter((g) => (totals.get(g.id) ?? 0) >= Number(g.target_amount)).length;
    return { target, saved, completed, total: goals.length };
  }, [goals, deposits, totals]);

  const handleDelete = async () => {
    if (!deleteId) return;
    // Delete deposits first (no FK cascade), then the goal
    const { error: depErr } = await supabase
      .from("savings_deposits")
      .delete()
      .eq("goal_id", deleteId);
    if (depErr) return toast.error(depErr.message);
    const { error } = await supabase.from("savings_goals").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("গোল মুছে ফেলা হয়েছে");
    setDeleteId(null);
    load();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
              <PiggyBank className="h-7 w-7 text-success" />
              সঞ্চয়
            </h1>
            <p className="text-sm text-muted-foreground">
              টার্গেট নির্ধারণ করে ছোট ছোট ধাপে স্বপ্ন পূরণ করুন
            </p>
          </div>
          <Button onClick={() => setGoalDialog({ open: true, goal: null })} className="press shadow-soft">
            <Plus className="mr-2 h-4 w-4" />
            নতুন গোল
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard icon={Target} label="মোট গোল" value={fmt(summary.total)} accent="primary" />
          <SummaryCard icon={Wallet} label="মোট লক্ষ্য" value={`৳${fmt(summary.target)}`} accent="accent" />
          <SummaryCard icon={TrendingUp} label="মোট সঞ্চয়" value={`৳${fmt(summary.saved)}`} accent="success" />
          <SummaryCard icon={CheckCircle2} label="পূর্ণ" value={fmt(summary.completed)} accent="success" />
        </div>

        {/* Goals */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : goals.length === 0 ? (
          <Card className="glass p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-success/30 to-success/10">
              <Sparkles className="h-8 w-8 text-success" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">কোনো সঞ্চয় গোল নেই</h3>
            <p className="mt-1 text-sm text-muted-foreground">আজই প্রথম গোল তৈরি করে যাত্রা শুরু করুন</p>
            <Button onClick={() => setGoalDialog({ open: true, goal: null })} className="mt-6 press">
              <Plus className="mr-2 h-4 w-4" />
              প্রথম গোল তৈরি করুন
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((g) => {
              const saved = totals.get(g.id) ?? 0;
              const target = Number(g.target_amount);
              const pct = Math.min(100, Math.round((saved / target) * 100));
              const remaining = Math.max(0, target - saved);
              const done = saved >= target;
              const colors = COLOR_MAP[g.color] ?? COLOR_MAP.success;

              return (
                <Card key={g.id} className="glass relative overflow-hidden p-5 hover-lift transition-spring">
                  <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${colors.from} ${colors.to} opacity-20 blur-2xl`} />

                  <div className="relative space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} shadow-md`}>
                            <PiggyBank className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold leading-tight">{g.name}</h3>
                            {g.deadline && (
                              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatBnDate(new Date(g.deadline))}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {done && (
                          <Badge className="bg-success text-success-foreground shadow-soft">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            পূর্ণ
                          </Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setGoalDialog({ open: true, goal: g })}>
                              <Pencil className="mr-2 h-4 w-4" />
                              এডিট
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(g.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              মুছুন
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-en text-2xl font-bold tracking-tight">৳{fmt(saved)}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          / ৳<span className="font-en">{fmt(target)}</span>
                        </p>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full bg-gradient-to-r ${colors.from} ${colors.to} transition-spring`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-muted-foreground">
                          {toBn(pct)}% সম্পন্ন
                        </span>
                        <span className="font-medium text-muted-foreground">
                          {done ? "🎉 অভিনন্দন!" : `৳${fmt(remaining)} বাকি`}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => setDepositDialog({ open: true, goalId: g.id, goalName: g.name })}
                      disabled={done}
                      className={`w-full press ${done ? "" : `${colors.bg} hover:opacity-90 text-white`}`}
                      variant={done ? "outline" : "default"}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {done ? "গোল পূর্ণ" : "সঞ্চয় যোগ করুন"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <SavingsGoalDialog
        open={goalDialog.open}
        onOpenChange={(v) => setGoalDialog({ open: v, goal: v ? goalDialog.goal : null })}
        goal={goalDialog.goal}
        onSaved={load}
      />

      <DepositDialog
        open={depositDialog.open}
        onOpenChange={(v) => setDepositDialog((s) => ({ ...s, open: v }))}
        goalId={depositDialog.goalId}
        goalName={depositDialog.goalName}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>গোল মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই গোলের সকল ডিপোজিট রেকর্ডসহ মুছে যাবে। এই কাজ পূর্ববর্তী অবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
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

const SummaryCard = ({
  icon: Icon, label, value, accent,
}: { icon: any; label: string; value: string; accent: "primary" | "accent" | "success" }) => (
  <Card className="glass relative overflow-hidden p-4">
    <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-${accent}/20 blur-2xl`} />
    <div className="relative space-y-2">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-${accent}/15 text-${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="font-en text-xl font-bold tracking-tight">{value}</p>
    </div>
  </Card>
);

export default Savings;
