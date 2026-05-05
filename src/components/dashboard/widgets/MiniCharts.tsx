import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, Flame, TrendingDown, PiggyBank } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Bar, BarChart, Line, LineChart, Tooltip as RTooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toBn, toLocalDateStr } from "@/lib/bangla";

const fmtMoney = (n: number) => `৳ ${toBn(Math.round(n).toLocaleString("en-US"))}`;

interface MiniProps {
  title: string; subtitle: string; icon: any; to: string; gradient: string; loading: boolean; children: React.ReactNode; metric?: string;
}
const MiniCard = ({ title, subtitle, icon: Icon, to, gradient, loading, children, metric }: MiniProps) => (
  <div className="group block">
    <Card className="relative h-full overflow-hidden p-5 shadow-soft glass transition-spring hover:shadow-elevated">
      <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full ${gradient} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity`} />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${gradient}`}>
              <Icon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">{title}</h4>
              <p className="text-[11px] text-muted-foreground font-medium">{subtitle}</p>
            </div>
          </div>
          <Link
            to={to}
            aria-label={`${title} বিশ্লেষণে যান`}
            className="press flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition-smooth hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
          >
            <ArrowRight className="h-3.5 w-3.5 transition-transform hover:translate-x-0.5" />
          </Link>
        </div>
        {metric && <p className="font-en text-xl font-bold tracking-tight">{metric}</p>}
        <div className="h-16">
          {loading ? <Skeleton className="h-full w-full rounded-md" /> : children}
        </div>
      </div>
    </Card>
  </div>
);

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 11,
  padding: "4px 8px",
};

/* ---- Routine completion mini ---- */
export const RoutineMini = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ d: string; rate: number }[]>([]);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 13);
      const sinceStr = toLocalDateStr(since);
      const [tR, cR] = await Promise.all([
        supabase.from("routine_templates").select("id,effective_from").eq("user_id", user.id).is("archived_at", null),
        supabase.from("routine_completions").select("completion_date,completed,skipped").eq("user_id", user.id).gte("completion_date", sinceStr),
      ]);
      const tpls = (tR.data ?? []) as { effective_from: string }[];
      const cmps = (cR.data ?? []) as { completion_date: string; completed: boolean; skipped: boolean }[];
      const arr: { d: string; rate: number }[] = [];
      let sum = 0, n = 0;
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = toLocalDateStr(d);
        const eligible = tpls.filter((t) => t.effective_from <= ds).length;
        const dayCmps = cmps.filter((c) => c.completion_date === ds);
        const skipped = dayCmps.filter((c) => c.skipped).length;
        const done = dayCmps.filter((c) => c.completed).length;
        const total = Math.max(0, eligible - skipped);
        const rate = total ? Math.round((done / total) * 100) : 0;
        arr.push({ d: ds.slice(-2), rate });
        if (total) { sum += rate; n++; }
      }
      setData(arr); setAvg(n ? Math.round(sum / n) : 0);
      setLoading(false);
    })();
  }, [user]);

  return (
    <MiniCard title="রুটিন" subtitle="গত ১৪ দিন" icon={Activity} to="/routine-analytics" gradient="bg-gradient-accent" loading={loading} metric={`${toBn(avg)}%`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${toBn(v)}%`, "হার"]} labelFormatter={() => ""} />
          <Area type="monotone" dataKey="rate" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#rg)" isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </MiniCard>
  );
};

/* ---- Habit consistency mini ---- */
export const HabitMini = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ d: string; v: number }[]>([]);
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 13);
      const { data: cdata } = await supabase.from("habit_checkins").select("checkin_date,count").eq("user_id", user.id).gte("checkin_date", toLocalDateStr(since));
      const c = (cdata ?? []) as { checkin_date: string; count: number }[];
      const arr: { d: string; v: number }[] = [];
      let total = 0;
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = toLocalDateStr(d);
        const v = c.filter((x) => x.checkin_date === ds).reduce((s, x) => s + x.count, 0);
        arr.push({ d: ds.slice(-2), v });
        total += v;
      }
      setData(arr); setDone(total);
      setLoading(false);
    })();
  }, [user]);

  return (
    <MiniCard title="অভ্যাস" subtitle="check-in ধারাবাহিকতা" icon={Flame} to="/habit-analytics" gradient="bg-gradient-to-br from-warning to-warning/60" loading={loading} metric={`${toBn(done)} টি`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [toBn(v), "check-in"]} labelFormatter={() => ""} />
          <Bar dataKey="v" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </MiniCard>
  );
};

/* ---- Finance spending trend ---- */
export const SpendingMini = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ d: string; v: number }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 13);
      const { data: tx } = await supabase.from("transactions").select("transaction_date,amount,type").eq("user_id", user.id).eq("type", "expense").gte("transaction_date", toLocalDateStr(since));
      const t = (tx ?? []) as { transaction_date: string; amount: number }[];
      const arr: { d: string; v: number }[] = [];
      let sum = 0;
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = toLocalDateStr(d);
        const v = t.filter((x) => x.transaction_date === ds).reduce((s, x) => s + Number(x.amount), 0);
        arr.push({ d: ds.slice(-2), v });
        sum += v;
      }
      setData(arr); setTotal(sum);
      setLoading(false);
    })();
  }, [user]);

  return (
    <MiniCard title="ব্যয় ট্রেন্ড" subtitle="গত ১৪ দিন" icon={TrendingDown} to="/finance" gradient="bg-gradient-to-br from-destructive to-destructive/60" loading={loading} metric={fmtMoney(total)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtMoney(v), "ব্যয়"]} labelFormatter={() => ""} />
          <Line type="monotone" dataKey="v" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </MiniCard>
  );
};

/* ---- Savings progress mini (last 6 months savings rate) ---- */
export const SavingsMini = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ d: string; rate: number }[]>([]);
  const [latest, setLatest] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1);
      const { data: tx } = await supabase.from("transactions").select("transaction_date,amount,type").eq("user_id", user.id).gte("transaction_date", toLocalDateStr(since));
      const t = (tx ?? []) as { transaction_date: string; amount: number; type: string }[];
      const arr: { d: string; rate: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthTx = t.filter((x) => x.transaction_date.startsWith(key));
        const inc = monthTx.filter((x) => x.type === "income").reduce((s, x) => s + Number(x.amount), 0);
        const exp = monthTx.filter((x) => x.type === "expense").reduce((s, x) => s + Number(x.amount), 0);
        const rate = inc > 0 ? Math.max(0, Math.round(((inc - exp) / inc) * 100)) : 0;
        arr.push({ d: String(d.getMonth() + 1), rate });
      }
      setData(arr); setLatest(arr[arr.length - 1]?.rate ?? 0);
      setLoading(false);
    })();
  }, [user]);

  return (
    <MiniCard title="সঞ্চয় হার" subtitle="গত ৬ মাস" icon={PiggyBank} to="/finance" gradient="bg-gradient-to-br from-success to-success/60" loading={loading} metric={`${toBn(latest)}%`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${toBn(v)}%`, "সঞ্চয়"]} labelFormatter={() => ""} />
          <Area type="monotone" dataKey="rate" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#sg)" isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </MiniCard>
  );
};