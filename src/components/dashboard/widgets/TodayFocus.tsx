import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ArrowRight, Clock, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBnTime, toBn, toLocalDateStr } from "@/lib/bangla";

interface Tpl { id: string; name: string; start_time: string | null; end_time: string | null; }
interface Comp { template_id: string; completed: boolean; skipped: boolean; }

export const TodayFocus = () => {
  const { user } = useAuth();
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [comps, setComps] = useState<Comp[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = toLocalDateStr(new Date());
      const [tR, cR] = await Promise.all([
        supabase.from("routine_templates").select("id,name,start_time,end_time").eq("user_id", user.id).is("archived_at", null).lte("effective_from", today).order("start_time", { ascending: true, nullsFirst: false }),
        supabase.from("routine_completions").select("template_id,completed,skipped").eq("user_id", user.id).eq("completion_date", today),
      ]);
      setTpls((tR.data ?? []) as Tpl[]);
      setComps((cR.data ?? []) as Comp[]);
      setLoading(false);
    })();
  }, [user]);

  const { active, next, upcoming } = useMemo(() => {
    const map = new Map(comps.map((c) => [c.template_id, c]));
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const withTime = tpls.filter((t) => t.start_time).map((t) => {
      const [sh, sm] = t.start_time!.split(":").map(Number);
      const startMin = sh * 60 + sm;
      let endMin = startMin + 30;
      if (t.end_time) { const [eh, em] = t.end_time.split(":").map(Number); endMin = eh * 60 + em; }
      const c = map.get(t.id);
      return { ...t, startMin, endMin, skipped: !!c?.skipped, completed: !!c?.completed };
    }).sort((a, b) => a.startMin - b.startMin);
    const a = withTime.find((x) => nowMin >= x.startMin && nowMin < x.endMin && !x.skipped) ?? null;
    const n = withTime.find((x) => x.startMin > nowMin && !x.skipped) ?? null;
    return { active: a, next: n, upcoming: withTime.filter((x) => x.startMin > nowMin && !x.skipped).slice(0, 3) };
  }, [tpls, comps, now]);

  return (
    <Card className="relative overflow-hidden p-6 shadow-soft glass">
      <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-gradient-accent opacity-15 blur-3xl" />
      <div className="relative space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">আজকের ফোকাস</h3>
            <p className="text-xs text-muted-foreground font-medium">এখন ও পরবর্তী কাজ</p>
          </div>
          <Link to="/routines" className="text-xs font-semibold text-accent hover:text-accent/80 hover:underline inline-flex items-center gap-1 transition-colors">
            সব দেখুন <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Active */}
            {active ? (
              <div className="relative overflow-hidden rounded-xl border border-accent/30 p-4 bg-gradient-to-br from-accent/10 to-transparent">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-accent opacity-25 blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent shadow-glow">
                    <Activity className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-accent font-bold">এখন চলছে</p>
                    <h4 className="truncate text-sm font-bold">{active.name}</h4>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-en">{formatBnTime(active.start_time)} – {formatBnTime(active.end_time)}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">এই মুহূর্তে কোনো রুটিন চলছে না</p>
              </div>
            )}

            {/* Next + upcoming list */}
            {next ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/70 font-bold">
                  <Bell className="h-3 w-3" /> পরবর্তী
                </div>
                {upcoming.map((u, i) => (
                  <div key={u.id} className={`flex items-center gap-3 rounded-lg border p-3 transition-smooth ${i === 0 ? "border-accent/30 bg-accent/10" : "border-border/60 bg-card/60"}`}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Clock className="h-4 w-4 text-foreground/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="font-en text-[11px] text-muted-foreground font-medium">
                        {formatBnTime(u.start_time)}{u.end_time && <> – {formatBnTime(u.end_time)}</>}
                      </p>
                    </div>
                    {i === 0 && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">পরবর্তী</span>}
                  </div>
                ))}
              </div>
            ) : (
              !active && tpls.length === 0 && (
                <Link to="/routines" className="block rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-center text-xs font-medium text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-colors">
                  রুটিন তৈরি করুন আপনার দিন সাজাতে
                </Link>
              )
            )}

            {/* Smart reminder */}
            {(() => {
              const hour = now.getHours();
              let tip = "";
              if (hour < 6) tip = "রাত্রি — ভালো ঘুম পরের দিনের ভিত্তি 🌙";
              else if (hour < 11) tip = "সকালের energy কাজে লাগান — সবচেয়ে productive সময়";
              else if (hour < 14) tip = "একটু পানি পান করুন এবং ছোট বিরতি নিন 💧";
              else if (hour < 18) tip = "বিকেলে হালকা কাজ — শক্ত কাজ পরে রাখুন";
              else if (hour < 22) tip = "দিনের রিভিউ করুন — আগামীকালের পরিকল্পনা সাজান";
              else tip = "রিল্যাক্স করুন — স্ক্রিন কম, ঘুম বেশি 🌿";
              return (
                <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/50 p-3">
                  <span className="text-base leading-none mt-0.5">💡</span>
                  <p className="text-xs leading-relaxed text-foreground/85 font-medium">{tip}</p>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </Card>
  );
};