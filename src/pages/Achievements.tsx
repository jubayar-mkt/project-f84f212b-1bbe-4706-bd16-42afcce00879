import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock, Trophy, Sparkles } from "lucide-react";
import {
  ACHIEVEMENTS,
  AchievementProgress,
  CATEGORY_META,
  computeAchievements,
  type AchievementCategory,
  type AchievementInputs,
} from "@/lib/achievements";
import {
  calcLongestStreak,
  formatBnDate,
  toBn,
} from "@/lib/bangla";

const fmtNum = (n: number) => toBn(n.toLocaleString("en-US"));

const AchievementCard = ({ a }: { a: AchievementProgress }) => {
  const Icon = a.icon;
  const meta = CATEGORY_META[a.category];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-smooth hover-lift ${
        a.unlocked
          ? "glass border-accent/40 shadow-glow"
          : "border-border/60 bg-card/60 opacity-90"
      }`}
    >
      {a.unlocked && (
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl"
             style={{ background: "radial-gradient(circle, hsl(var(--accent)/0.6), transparent 70%)" }} />
      )}

      <div className="relative flex items-start gap-4">
        <div
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.color} text-white shadow-md ${
            a.unlocked ? "animate-scale-in" : "grayscale opacity-60"
          }`}
        >
          <Icon className="h-7 w-7" strokeWidth={2.2} />
          {!a.unlocked && (
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 border border-border">
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold leading-tight ${a.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
              {a.title}
            </h3>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${a.unlocked ? "border-accent/40 text-accent" : ""}`}
            >
              {meta.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.description}</p>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {fmtNum(Math.min(a.current, a.target))} / {fmtNum(a.target)}
              </span>
              <span className={`font-semibold ${a.unlocked ? "text-accent" : "text-muted-foreground"}`}>
                {toBn(a.percent)}%
              </span>
            </div>
            <Progress value={a.percent} className="h-1.5" />
          </div>

          {a.unlocked && a.unlockedAt && (
            <p className="mt-2 text-[10px] text-accent/80">
              আনলকড · {formatBnDate(a.unlockedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const Achievements = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AchievementProgress[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [checkins, routines, txs, prayer] = await Promise.all([
          supabase
            .from("habit_checkins")
            .select("checkin_date, habit_id")
            .eq("user_id", user.id),
          supabase
            .from("routine_completions")
            .select("completion_date, completed")
            .eq("user_id", user.id)
            .eq("completed", true),
          supabase
            .from("transactions")
            .select("type, amount, transaction_date")
            .eq("user_id", user.id),
          supabase
            .from("prayer_settings")
            .select("fajr_time, dhuhr_time, asr_time, maghrib_time, isha_time")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        const checkinRows = checkins.data ?? [];
        const routineRows = routines.data ?? [];
        const txRows = txs.data ?? [];
        const prayerRow = prayer.data;

        // Habit streak: per-habit longest, then max
        const byHabit = new Map<string, string[]>();
        for (const c of checkinRows) {
          const arr = byHabit.get(c.habit_id) ?? [];
          arr.push(c.checkin_date as string);
          byHabit.set(c.habit_id, arr);
        }
        let longestHabitStreak = 0;
        for (const dates of byHabit.values()) {
          longestHabitStreak = Math.max(longestHabitStreak, calcLongestStreak(dates));
        }

        const distinctHabitDays = new Set(checkinRows.map((c) => c.checkin_date)).size;
        const firstHabitDate =
          checkinRows.length > 0
            ? new Date(
                checkinRows
                  .map((c) => c.checkin_date as string)
                  .sort()[0]
              )
            : null;

        const distinctRoutineDays = new Set(routineRows.map((r) => r.completion_date)).size;
        const firstRoutineDate =
          routineRows.length > 0
            ? new Date(
                routineRows.map((r) => r.completion_date as string).sort()[0]
              )
            : null;

        const totalIncome = txRows
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + Number(t.amount ?? 0), 0);
        const totalExpense = txRows
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + Number(t.amount ?? 0), 0);
        const netSavings = totalIncome - totalExpense;
        const firstTransactionDate =
          txRows.length > 0
            ? new Date(
                txRows.map((t) => t.transaction_date as string).sort()[0]
              )
            : null;

        const namazSetupDone = !!prayerRow && Object.values(prayerRow).some((v) => !!v);

        const created = user.created_at ? new Date(user.created_at) : new Date();
        const accountAgeDays = Math.max(
          1,
          Math.floor((Date.now() - created.getTime()) / 86400000)
        );

        const inputs: AchievementInputs = {
          longestHabitStreak,
          totalHabitCheckins: checkinRows.length,
          distinctHabitDays,
          firstHabitDate,
          totalRoutineCompletions: routineRows.length,
          distinctRoutineDays,
          firstRoutineDate,
          totalTransactions: txRows.length,
          totalIncome,
          netSavings,
          firstTransactionDate,
          namazSetupDone,
          accountAgeDays,
        };

        if (!cancelled) setItems(computeAchievements(inputs));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const unlocked = items.filter((i) => i.unlocked).length;
    const total = ACHIEVEMENTS.length;
    const pct = total ? Math.round((unlocked / total) * 100) : 0;
    return { unlocked, total, pct };
  }, [items]);

  const grouped = useMemo(() => {
    const g: Record<AchievementCategory, AchievementProgress[]> = {
      habit: [],
      routine: [],
      finance: [],
      savings: [],
      consistency: [],
      milestone: [],
    };
    for (const a of items) g[a.category].push(a);
    return g;
  }, [items]);

  const categories: AchievementCategory[] = ["habit", "routine", "finance", "savings", "consistency", "milestone"];

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 md:p-8 shadow-soft">
          <div className="absolute inset-0 bg-glow opacity-70" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-accent opacity-15 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">অর্জন কেন্দ্র</p>
              <h1 className="text-xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Trophy className="h-7 w-7 text-accent" />
                আপনার অর্জনসমূহ
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground max-w-md">
                অভ্যাস, রুটিন, অর্থ ও ধারাবাহিকতার মাধ্যমে অর্জন আনলক করুন।
              </p>
            </div>
            <div className="glass rounded-2xl border border-border/60 px-5 py-4 min-w-[200px]">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">মোট আনলকড</span>
                <span className="text-xs text-accent font-semibold">{toBn(stats.pct)}%</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">{toBn(stats.unlocked)}</span>
                <span className="text-sm text-muted-foreground">/ {toBn(stats.total)}</span>
              </div>
              <Progress value={stats.pct} className="mt-2 h-1.5" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-5">
          <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-card">সব</TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c} value={c} className="data-[state=active]:bg-card">
                {CATEGORY_META[c].label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {loading ? (
              <SkeletonGrid />
            ) : (
              categories.map((c) =>
                grouped[c].length === 0 ? null : (
                  <section key={c} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <h2 className="text-sm font-semibold tracking-tight text-foreground">
                        {CATEGORY_META[c].label}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        ({toBn(grouped[c].filter((a) => a.unlocked).length)}/{toBn(grouped[c].length)})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {grouped[c].map((a) => (
                        <AchievementCard key={a.id} a={a} />
                      ))}
                    </div>
                  </section>
                )
              )
            )}
          </TabsContent>

          {categories.map((c) => (
            <TabsContent key={c} value={c}>
              {loading ? (
                <SkeletonGrid />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[c].map((a) => (
                    <AchievementCard key={a.id} a={a} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
};

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-36 rounded-2xl border border-border/60 bg-card/60 animate-pulse" />
    ))}
  </div>
);

export default Achievements;