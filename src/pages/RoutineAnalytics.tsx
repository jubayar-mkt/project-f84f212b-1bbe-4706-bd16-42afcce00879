import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  Trophy,
  AlertCircle,
  Activity,
  Flame,
  CalendarCheck,
  Clock,
  Target,
  Timer,
} from "lucide-react";
import { BN_DAYS, toBn, toLocalDateStr } from "@/lib/bangla";
import { StatCard } from "@/components/dashboard/StatCard";
import { BanglaDateRangePicker, DateRange } from "@/components/ui/bangla-date-range-picker";
import { RoutineAIInsights } from "@/components/routines/RoutineAIInsights";

interface RoutineRow {
  id: string;
  name: string;
  category: string | null;
  scheduled_time: string | null;
  end_time: string | null;
  scheduled_date: string;
  completed: boolean;
  priority: string;
  completed_at: string | null;
}

type Preset = "week" | "month" | "90d" | "custom";

const presetRange = (p: Preset, custom: DateRange): DateRange => {
  const end = new Date();
  const start = new Date();
  if (p === "week") start.setDate(end.getDate() - 6);
  else if (p === "month") start.setDate(end.getDate() - 29);
  else if (p === "90d") start.setDate(end.getDate() - 89);
  else return custom;
  return { start, end };
};

const minutesBetween = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const m = eh * 60 + em - (sh * 60 + sm);
  return m > 0 ? m : 0;
};

const RoutineAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [preset, setPreset] = useState<Preset>("month");
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setDate(today.getDate() - 29);
  const [customRange, setCustomRange] = useState<DateRange>({ start: monthAgo, end: today });

  const range = useMemo(() => presetRange(preset, customRange), [preset, customRange]);
  const startStr = toLocalDateStr(range.start);
  const endStr = toLocalDateStr(range.end);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const todayStr = toLocalDateStr(new Date());
      const upperStr = endStr < todayStr ? endStr : todayStr; // don't count future days
      const [tplR, cmpR] = await Promise.all([
        supabase
          .from("routine_templates")
          .select("id,name,category,start_time,end_time,priority,effective_from,archived_at")
          .eq("user_id", user.id)
          .lte("effective_from", upperStr),
        supabase
          .from("routine_completions")
          .select("template_id,completion_date,completed,skipped,completed_at")
          .eq("user_id", user.id)
          .gte("completion_date", startStr)
          .lte("completion_date", upperStr),
      ]);
      const templates = (tplR.data ?? []) as Array<{
        id: string; name: string; category: string | null;
        start_time: string | null; end_time: string | null;
        priority: string; effective_from: string; archived_at: string | null;
      }>;
      const cmpMap = new Map<string, { completed: boolean; skipped: boolean; completed_at: string | null }>();
      for (const c of (cmpR.data ?? []) as Array<{ template_id: string; completion_date: string; completed: boolean; skipped: boolean; completed_at: string | null }>) {
        cmpMap.set(`${c.template_id}|${c.completion_date}`, c);
      }
      // Expand templates over the date range
      const rows: RoutineRow[] = [];
      const cur = new Date(range.start);
      const upper = new Date(upperStr);
      while (cur <= upper) {
        const ds = toLocalDateStr(cur);
        for (const t of templates) {
          if (ds < t.effective_from) continue;
          if (t.archived_at && ds > toLocalDateStr(new Date(t.archived_at))) continue;
          const c = cmpMap.get(`${t.id}|${ds}`);
          if (c?.skipped) continue; // skipped days are excluded from analytics
          rows.push({
            id: `${t.id}-${ds}`,
            name: t.name,
            category: t.category,
            scheduled_time: t.start_time,
            end_time: t.end_time,
            scheduled_date: ds,
            completed: !!c?.completed,
            priority: t.priority,
            completed_at: c?.completed_at ?? null,
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
      setRoutines(rows);
      setLoading(false);
    })();
  }, [user, startStr, endStr]);

  // Core metrics
  const metrics = useMemo(() => {
    const total = routines.length;
    const completed = routines.filter((r) => r.completed).length;
    const missed = total - completed;
    const rate = total ? Math.round((completed / total) * 100) : 0;

    const plannedMin = routines.reduce((s, r) => s + minutesBetween(r.scheduled_time, r.end_time), 0);
    const completedMin = routines
      .filter((r) => r.completed)
      .reduce((s, r) => s + minutesBetween(r.scheduled_time, r.end_time), 0);

    return {
      total,
      completed,
      missed,
      rate,
      plannedHours: Math.round((plannedMin / 60) * 10) / 10,
      completedHours: Math.round((completedMin / 60) * 10) / 10,
    };
  }, [routines]);

  // Trend data (per day)
  const trendData = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    const cur = new Date(range.start);
    while (cur <= range.end) {
      map.set(toLocalDateStr(cur), { total: 0, done: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    for (const r of routines) {
      const m = map.get(r.scheduled_date);
      if (!m) continue;
      m.total++;
      if (r.completed) m.done++;
    }
    return Array.from(map.entries()).map(([date, s]) => {
      const d = new Date(date);
      return {
        date,
        label: `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}`,
        rate: s.total ? Math.round((s.done / s.total) * 100) : 0,
        total: s.total,
        done: s.done,
      };
    });
  }, [routines, range]);

  // Hourly heatmap (5 AM - 11 PM)
  const hourlyStats = useMemo(() => {
    const stats: { hour: number; total: number; done: number; rate: number }[] = [];
    for (let h = 5; h < 24; h++) stats.push({ hour: h, total: 0, done: 0, rate: 0 });
    for (const r of routines) {
      if (!r.scheduled_time) continue;
      const h = parseInt(r.scheduled_time.split(":")[0], 10);
      const s = stats.find((x) => x.hour === h);
      if (!s) continue;
      s.total++;
      if (r.completed) s.done++;
    }
    for (const s of stats) s.rate = s.total ? Math.round((s.done / s.total) * 100) : 0;
    return stats;
  }, [routines]);

  const bestHour = useMemo(() => {
    const valid = hourlyStats.filter((x) => x.total >= 1);
    return valid.sort((a, b) => b.rate - a.rate)[0];
  }, [hourlyStats]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const r of routines) {
      const c = r.category || "অন্যান্য";
      const cur = map.get(c) ?? { total: 0, done: 0 };
      cur.total++;
      if (r.completed) cur.done++;
      map.set(c, cur);
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({
        name,
        total: s.total,
        done: s.done,
        rate: s.total ? Math.round((s.done / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [routines]);

  // Day of week
  const dayPattern = useMemo(() => {
    const stats = new Array(7).fill(0).map(() => ({ total: 0, done: 0 }));
    for (const r of routines) {
      const d = new Date(r.scheduled_date);
      const dow = d.getDay();
      stats[dow].total++;
      if (r.completed) stats[dow].done++;
    }
    return BN_DAYS.map((label, i) => ({
      label,
      total: stats[i].total,
      done: stats[i].done,
      rate: stats[i].total ? Math.round((stats[i].done / stats[i].total) * 100) : 0,
    }));
  }, [routines]);

  const bestDay = useMemo(() => {
    const valid = dayPattern.filter((d) => d.total > 0);
    return [...valid].sort((a, b) => b.rate - a.rate)[0];
  }, [dayPattern]);
  const worstDay = useMemo(() => {
    const valid = dayPattern.filter((d) => d.total > 0);
    return [...valid].sort((a, b) => a.rate - b.rate)[0];
  }, [dayPattern]);

  // Most consistent routine (by name, completion rate)
  const consistentRoutine = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const r of routines) {
      const cur = map.get(r.name) ?? { total: 0, done: 0 };
      cur.total++;
      if (r.completed) cur.done++;
      map.set(r.name, cur);
    }
    return Array.from(map.entries())
      .filter(([, s]) => s.total >= 2)
      .map(([name, s]) => ({ name, rate: Math.round((s.done / s.total) * 100), total: s.total }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total)[0];
  }, [routines]);

  // Streak (consecutive days with at least one completion)
  const streak = useMemo(() => {
    const set = new Set(routines.filter((r) => r.completed).map((r) => r.scheduled_date));
    if (!set.size) return 0;
    let s = 0;
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    let i = set.has(toLocalDateStr(t)) ? 0 : 1;
    while (true) {
      const d = new Date(t);
      d.setDate(t.getDate() - i);
      if (set.has(toLocalDateStr(d))) {
        s++;
        i++;
      } else break;
    }
    return s;
  }, [routines]);

  const donutData = [
    { name: "সম্পন্ন", value: metrics.completed, color: "hsl(var(--accent))" },
    { name: "মিসড", value: metrics.missed, color: "hsl(var(--muted))" },
  ];

  const PRESETS: { v: Preset; label: string }[] = [
    { v: "week", label: "সাপ্তাহিক" },
    { v: "month", label: "মাসিক" },
    { v: "90d", label: "৯০ দিন" },
    { v: "custom", label: "কাস্টম" },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">বিশ্লেষণ</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">রুটিন অ্যানালিটিক্স</h1>
            <p className="text-sm text-muted-foreground">
              আপনার productivity, সেরা সময় ও উন্নতির সুযোগ এক নজরে
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={preset}
              onValueChange={(v) => v && setPreset(v as Preset)}
              className="rounded-lg border border-border/60 bg-card p-1 shadow-soft"
            >
              {PRESETS.map((p) => (
                <ToggleGroupItem
                  key={p.v}
                  value={p.v}
                  className="rounded-md px-3 py-1.5 text-xs font-medium data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow-soft"
                >
                  {p.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {preset === "custom" && (
              <BanglaDateRangePicker value={customRange} onChange={setCustomRange} />
            )}
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
              <StatCard
                label="মোট সম্পন্ন"
                value={toBn(metrics.completed)}
                hint={`মোট ${toBn(metrics.total)} এর মধ্যে`}
                icon={CalendarCheck}
                accent="success"
              />
              <StatCard
                label="সম্পন্নতার হার"
                value={`${toBn(metrics.rate)}%`}
                hint="নির্বাচিত সময়কাল"
                icon={Target}
                accent="accent"
              />
              <StatCard
                label="মিসড রুটিন"
                value={toBn(metrics.missed)}
                hint={metrics.missed > 0 ? "মনোযোগ দরকার" : "চমৎকার!"}
                icon={AlertCircle}
                accent="warning"
              />
              <StatCard
                label="স্ট্রিক"
                value={`${toBn(streak)} দিন`}
                hint="🔥 ধারাবাহিকতা"
                icon={Flame}
                accent="warning"
              />
            </div>

            {/* Highlights row */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5 shadow-soft">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>সবচেয়ে productive সময়</span>
                </div>
                <p className="mt-2 text-xl font-bold font-en">
                  {bestHour && bestHour.total > 0
                    ? `${toBn(bestHour.hour > 12 ? bestHour.hour - 12 : bestHour.hour || 12)}:০০ ${bestHour.hour >= 12 ? "PM" : "AM"}`
                    : "—"}
                </p>
                {bestHour && bestHour.total > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toBn(bestHour.rate)}% সম্পন্নতার হার
                  </p>
                )}
              </Card>
              <Card className="p-5 shadow-soft">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>সবচেয়ে consistent রুটিন</span>
                </div>
                <p className="mt-2 text-base font-bold truncate">
                  {consistentRoutine?.name ?? "—"}
                </p>
                {consistentRoutine && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toBn(consistentRoutine.rate)}% • {toBn(consistentRoutine.total)} বার
                  </p>
                )}
              </Card>
              <Card className="p-5 shadow-soft">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  <span>সম্পন্ন বনাম পরিকল্পিত</span>
                </div>
                <p className="mt-2 text-xl font-bold font-en">
                  {toBn(metrics.completedHours)}h <span className="text-sm text-muted-foreground">/ {toBn(metrics.plannedHours)}h</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {metrics.plannedHours > 0
                    ? `${toBn(Math.round((metrics.completedHours / metrics.plannedHours) * 100))}% সময় কাজে লাগানো`
                    : "ডেটা নেই"}
                </p>
              </Card>
            </div>

            {/* Trend */}
            <Card className="p-6 shadow-soft">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">সম্পন্নতার ট্রেন্ড</h3>
                  <p className="text-xs text-muted-foreground">দৈনিক completion rate</p>
                </div>
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="rTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={Math.max(0, Math.floor(trendData.length / 10))} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`${toBn(v)}%`, "সম্পন্নতার হার"]}
                    />
                    <Area type="monotone" dataKey="rate" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#rTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Two columns: weekday + donut */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 p-6 shadow-soft">
                <div className="mb-5">
                  <h3 className="text-base font-semibold">সাপ্তাহিক প্যাটার্ন</h3>
                  <p className="text-xs text-muted-foreground">কোন দিনে productivity বেশি</p>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayPattern}>
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
                        formatter={(v: number, n: string) => [toBn(v), n === "done" ? "সম্পন্ন" : "মোট"]}
                      />
                      <Bar dataKey="total" fill="hsl(var(--muted))" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="done" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 shadow-soft">
                <div className="mb-5">
                  <h3 className="text-base font-semibold">পরিকল্পিত vs সম্পন্ন</h3>
                  <p className="text-xs text-muted-foreground">সামগ্রিক চিত্র</p>
                </div>
                <div className="h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [toBn(v), ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold font-en">{toBn(metrics.rate)}%</p>
                    <p className="text-[10px] text-muted-foreground">সম্পন্ন</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent" /> সম্পন্ন {toBn(metrics.completed)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" /> মিসড {toBn(metrics.missed)}
                  </span>
                </div>
              </Card>
            </div>

            {/* Time block heatmap */}
            <Card className="p-6 shadow-soft">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">সময়-ব্লক হিটম্যাপ</h3>
                  <p className="text-xs text-muted-foreground">কোন সময়ে রুটিন বেশি সফল হয়</p>
                </div>
                {bestDay && (
                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      সেরা: {bestDay.label} ({toBn(bestDay.rate)}%)
                    </Badge>
                    {worstDay && worstDay.label !== bestDay.label && (
                      <Badge variant="outline" className="border-warning/30 text-warning">
                        দুর্বল: {worstDay.label} ({toBn(worstDay.rate)}%)
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-[auto,1fr] gap-3">
                <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                  <div className="h-7" />
                </div>
                <div className="grid grid-cols-19 gap-1.5" style={{ gridTemplateColumns: "repeat(19, minmax(0, 1fr))" }}>
                  {hourlyStats.map((s) => {
                    const intensity = s.total === 0 ? 0 : Math.max(0.15, s.rate / 100);
                    const display = s.hour > 12 ? s.hour - 12 : s.hour || 12;
                    const period = s.hour >= 12 ? "PM" : "AM";
                    return (
                      <div key={s.hour} className="flex flex-col items-center gap-1">
                        <div
                          title={`${display} ${period} • ${s.done}/${s.total} (${s.rate}%)`}
                          className="h-10 w-full rounded-md border border-border/40 transition-all hover:scale-110 hover:shadow-glow"
                          style={{
                            background:
                              s.total === 0
                                ? "hsl(var(--muted) / 0.4)"
                                : `linear-gradient(135deg, hsl(var(--accent) / ${intensity}), hsl(var(--primary-glow) / ${intensity * 0.7}))`,
                          }}
                        />
                        <span className="text-[9px] font-en text-muted-foreground">{toBn(display)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-muted-foreground font-en">
                AM ←→ PM (5 — 11)
              </p>
            </Card>

            {/* Categories */}
            <Card className="p-6 shadow-soft">
              <div className="mb-4">
                <h3 className="text-base font-semibold">ক্যাটাগরি অনুযায়ী</h3>
                <p className="text-xs text-muted-foreground">প্রতিটি বিভাগের সম্পন্নতার হার</p>
              </div>
              {categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground">এই সময়কালে কোনো রুটিন নেই।</p>
              ) : (
                <div className="space-y-3">
                  {categoryData.map((c) => (
                    <div key={c.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="font-en text-xs text-muted-foreground">
                          {toBn(c.done)}/{toBn(c.total)} • {toBn(c.rate)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent transition-all"
                          style={{ width: `${c.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* AI Insights */}
            <RoutineAIInsights startDate={startStr} endDate={endStr} />

            {routines.length === 0 && (
              <Card className="border-dashed border-2 border-border/60 p-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold">এই সময়কালে কোনো রুটিন নেই</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  রুটিন যোগ করুন বা অন্য সময়কাল নির্বাচন করুন
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default RoutineAnalytics;