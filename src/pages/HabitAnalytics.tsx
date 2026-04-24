import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Trophy, AlertCircle, Activity, Flame, CalendarCheck } from "lucide-react";
import { BN_DAYS, calcLongestStreak, calcStreak, toBn, toLocalDateStr } from "@/lib/bangla";
import { StatCard } from "@/components/dashboard/StatCard";

interface Habit {
  id: string;
  name: string;
  color: string;
  target_per_day: number;
  created_at: string;
}
interface CheckIn {
  habit_id: string;
  checkin_date: string;
  count: number;
}

const RANGE_DAYS = 30;

const HabitAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - RANGE_DAYS + 1);
      const sinceStr = toLocalDateStr(since);

      const [{ data: h }, { data: c }] = await Promise.all([
        supabase.from("habits").select("id,name,color,target_per_day,created_at").eq("active", true),
        supabase.from("habit_checkins").select("habit_id,checkin_date,count").gte("checkin_date", sinceStr),
      ]);
      setHabits((h as Habit[]) ?? []);
      setCheckins((c as CheckIn[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  // Build last-30-days trend (sum of check-ins)
  const trendData = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = RANGE_DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(toLocalDateStr(d), 0);
    }
    for (const c of checkins) {
      if (map.has(c.checkin_date)) map.set(c.checkin_date, (map.get(c.checkin_date) ?? 0) + c.count);
    }
    return Array.from(map.entries()).map(([date, total]) => {
      const d = new Date(date);
      return {
        date,
        label: `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}`,
        total,
      };
    });
  }, [checkins]);

  // Per-habit aggregates
  const perHabit = useMemo(() => {
    return habits.map((h) => {
      const dates = checkins.filter((c) => c.habit_id === h.id).map((c) => c.checkin_date);
      const uniqueDates = Array.from(new Set(dates));
      const totalCheckins = checkins.filter((c) => c.habit_id === h.id).reduce((s, c) => s + c.count, 0);
      const created = new Date(h.created_at);
      const today = new Date();
      const ageDays = Math.max(1, Math.min(RANGE_DAYS, Math.round((today.getTime() - created.getTime()) / 86400000) + 1));
      const completionRate = Math.round((uniqueDates.length / ageDays) * 100);
      const current = calcStreak(uniqueDates.sort().reverse());
      const longest = calcLongestStreak(uniqueDates);
      return {
        ...h,
        totalCheckins,
        activeDays: uniqueDates.length,
        completionRate: Math.min(100, completionRate),
        currentStreak: current,
        longestStreak: longest,
      };
    });
  }, [habits, checkins]);

  const ranked = useMemo(() => [...perHabit].sort((a, b) => b.completionRate - a.completionRate), [perHabit]);
  const best = ranked.slice(0, 3);
  const worst = [...ranked].reverse().slice(0, 3).filter((h) => !best.find((b) => b.id === h.id));

  // Streak distribution buckets
  const streakBuckets = useMemo(() => {
    const buckets = [
      { label: "০", min: 0, max: 0, count: 0 },
      { label: "১-৩", min: 1, max: 3, count: 0 },
      { label: "৪-৭", min: 4, max: 7, count: 0 },
      { label: "৮-১৪", min: 8, max: 14, count: 0 },
      { label: "১৫-৩০", min: 15, max: 30, count: 0 },
      { label: "৩০+", min: 31, max: Infinity, count: 0 },
    ];
    for (const h of perHabit) {
      const s = h.longestStreak;
      const b = buckets.find((b) => s >= b.min && s <= b.max);
      if (b) b.count++;
    }
    return buckets;
  }, [perHabit]);

  // Weekday pattern
  const weekdayPattern = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const c of checkins) {
      const d = new Date(c.checkin_date);
      counts[d.getDay()] += c.count;
    }
    return BN_DAYS.map((label, i) => ({ label, total: counts[i] }));
  }, [checkins]);

  const totals = useMemo(() => {
    const totalCheckins = checkins.reduce((s, c) => s + c.count, 0);
    const activeHabits = habits.length;
    const avgCompletion = perHabit.length
      ? Math.round(perHabit.reduce((s, h) => s + h.completionRate, 0) / perHabit.length)
      : 0;
    const topStreak = perHabit.reduce((m, h) => Math.max(m, h.longestStreak), 0);
    return { totalCheckins, activeHabits, avgCompletion, topStreak };
  }, [checkins, habits, perHabit]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">বিশ্লেষণ</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">অভ্যাস অ্যানালিটিক্স</h1>
          <p className="text-sm text-muted-foreground">গত ৩০ দিনের কার্যক্রম, সেরা ও দুর্বল অভ্যাস এবং স্ট্রিক বিশ্লেষণ</p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="মোট চেক-ইন" value={toBn(totals.totalCheckins)} hint="গত ৩০ দিন" icon={CalendarCheck} accent="accent" />
              <StatCard label="সক্রিয় অভ্যাস" value={toBn(totals.activeHabits)} hint="চলমান" icon={Activity} accent="primary" />
              <StatCard label="গড় সম্পন্নতা" value={`${toBn(totals.avgCompletion)}%`} hint="সব অভ্যাস" icon={TrendingUp} accent="success" />
              <StatCard label="দীর্ঘতম স্ট্রিক" value={`${toBn(totals.topStreak)} দিন`} hint="🔥 রেকর্ড" icon={Flame} accent="warning" />
            </div>

            <Card className="p-6 shadow-soft">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">চেক-ইন ট্রেন্ড</h3>
                  <p className="text-xs text-muted-foreground">দৈনিক মোট চেক-ইন (৩০ দিন)</p>
                </div>
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [toBn(v), "চেক-ইন"]}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#trendGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6 shadow-soft">
                <div className="mb-5">
                  <h3 className="text-base font-semibold">স্ট্রিক বিতরণ</h3>
                  <p className="text-xs text-muted-foreground">দীর্ঘতম স্ট্রিকের বাকেট অনুযায়ী অভ্যাস সংখ্যা</p>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={streakBuckets}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [toBn(v), "অভ্যাস"]}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {streakBuckets.map((_, i) => (
                          <Cell key={i} fill={`hsl(var(--accent) / ${0.4 + i * 0.12})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 shadow-soft">
                <div className="mb-5">
                  <h3 className="text-base font-semibold">সাপ্তাহিক প্যাটার্ন</h3>
                  <p className="text-xs text-muted-foreground">কোন বারে আপনি বেশি ধারাবাহিক</p>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdayPattern}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [toBn(v), "চেক-ইন"]}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6 shadow-soft">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-success" />
                  <h3 className="text-base font-semibold">সেরা অভ্যাস</h3>
                </div>
                {best.length === 0 ? (
                  <p className="text-sm text-muted-foreground">এখনো যথেষ্ট ডেটা নেই।</p>
                ) : (
                  <ul className="space-y-3">
                    {best.map((h, i) => (
                      <li key={h.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success font-en text-sm font-bold">
                          {toBn(i + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{h.name}</p>
                          <p className="text-xs text-muted-foreground">
                            স্ট্রিক {toBn(h.currentStreak)} • দীর্ঘতম {toBn(h.longestStreak)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="font-en">
                          {toBn(h.completionRate)}%
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-6 shadow-soft">
                <div className="mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <h3 className="text-base font-semibold">মনোযোগ দরকার</h3>
                </div>
                {worst.length === 0 ? (
                  <p className="text-sm text-muted-foreground">দারুণ! সব অভ্যাসই ভালো চলছে।</p>
                ) : (
                  <ul className="space-y-3">
                    {worst.map((h) => (
                      <li key={h.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15 text-warning">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{h.name}</p>
                          <p className="text-xs text-muted-foreground">
                            সক্রিয় দিন {toBn(h.activeDays)} • স্ট্রিক {toBn(h.currentStreak)}
                          </p>
                        </div>
                        <Badge variant="outline" className="font-en">
                          {toBn(h.completionRate)}%
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card className="p-6 shadow-soft">
              <div className="mb-4">
                <h3 className="text-base font-semibold">সব অভ্যাসের তুলনা</h3>
                <p className="text-xs text-muted-foreground">সম্পন্নতার হার অনুযায়ী</p>
              </div>
              {ranked.length === 0 ? (
                <p className="text-sm text-muted-foreground">কোন অভ্যাস নেই।</p>
              ) : (
                <div className="space-y-3">
                  {ranked.map((h) => (
                    <div key={h.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{h.name}</span>
                        <span className="font-en text-xs text-muted-foreground">
                          {toBn(h.completionRate)}% • {toBn(h.totalCheckins)} চেক-ইন
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent transition-all"
                          style={{ width: `${h.completionRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default HabitAnalytics;
