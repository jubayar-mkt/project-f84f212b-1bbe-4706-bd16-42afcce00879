import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { TodayRoutineCard } from "@/components/dashboard/widgets/TodayRoutineCard";
import { HabitStreakCard } from "@/components/dashboard/widgets/HabitStreakCard";
import { FinanceBalanceCard } from "@/components/dashboard/widgets/FinanceBalanceCard";
import { SavingsGoalCard } from "@/components/dashboard/widgets/SavingsGoalCard";
import { TodayFocus } from "@/components/dashboard/widgets/TodayFocus";
import { TodayHabitChecklist } from "@/components/dashboard/widgets/TodayHabitChecklist";
import { DailyAIInsight } from "@/components/dashboard/widgets/DailyAIInsight";
import { RoutineMini, HabitMini, SpendingMini, SavingsMini } from "@/components/dashboard/widgets/MiniCharts";
import { formatBnDate } from "@/lib/bangla";

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "শুভ সকাল";
  if (h < 17) return "শুভ দুপুর";
  if (h < 20) return "শুভ বিকেল";
  return "শুভ সন্ধ্যা";
};

const Dashboard = () => {
  const { user } = useAuth();
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "বন্ধু";

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
        {/* Hero greeting */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 md:p-8 shadow-soft">
          <div className="absolute inset-0 bg-glow opacity-70" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-accent opacity-15 blur-3xl" />
          <div className="relative space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{formatBnDate(new Date())}</p>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">
              {greet()}, <span className="text-accent">{name}</span> 🌿
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-md">
              আপনার দিনের সম্পূর্ণ overview এক নজরে — রুটিন, অভ্যাস ও আর্থিক অবস্থা।
            </p>
          </div>
        </div>

        {/* Mobile: sticky Today Focus pinned at top under header.
            Desktop: rendered later in its normal position. */}
        <section className="lg:hidden sticky top-2 z-20 -mx-1 px-1">
          <TodayFocus />
        </section>

        {/* Top overview — 4 stat cards */}
        <section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <TodayRoutineCard />
          <HabitStreakCard />
          <FinanceBalanceCard />
          <SavingsGoalCard />
        </section>

        {/* AI insight */}
        <DailyAIInsight />

        {/* Today focus (desktop) + habit checklist (always) */}
        <section className="grid gap-4 md:gap-6 lg:grid-cols-3">
          <div className="hidden lg:block lg:col-span-2">
            <TodayFocus />
          </div>
          <TodayHabitChecklist />
        </section>

        {/* Analytics preview */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-base md:text-lg font-semibold">বিশ্লেষণ Preview</h2>
              <p className="text-xs text-muted-foreground">গত ১৪ দিনের সংক্ষিপ্ত প্রবণতা</p>
            </div>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <RoutineMini />
            <HabitMini />
            <SpendingMini />
            <SavingsMini />
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;