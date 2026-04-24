import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronLeft, ChevronRight, ListTodo, CalendarDays, Activity, Clock, ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RoutineDialog, RoutineTemplateFormData } from "@/components/routines/RoutineDialog";
import { Routine } from "@/components/routines/RoutineItem";
import { RoutineTimeline } from "@/components/routines/RoutineTimeline";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BN_DAYS_FULL, formatBnDate, formatBnTime, toBn, toLocalDateStr } from "@/lib/bangla";

interface Template {
  id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
  priority: "low" | "medium" | "high";
  active: boolean;
  effective_from: string;
  source: "manual" | "prayer";
  prayer_key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | null;
}

interface Completion {
  template_id: string;
  completed: boolean;
  skipped: boolean;
}

const Routines = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [templates, setTemplates] = useState<Template[]>([]);
  const [completions, setCompletions] = useState<Record<string, Completion>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);

  const dateStr = toLocalDateStr(date);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [tplRes, compRes] = await Promise.all([
      supabase
        .from("routine_templates")
        .select("id,name,description,start_time,end_time,category,priority,active,effective_from,source,prayer_key")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .lte("effective_from", dateStr)
        .order("start_time", { ascending: true, nullsFirst: false }),
      supabase
        .from("routine_completions")
        .select("template_id,completed,skipped")
        .eq("user_id", user.id)
        .eq("completion_date", dateStr),
    ]);
    setLoading(false);
    if (tplRes.error) { toast.error(tplRes.error.message); return; }
    setTemplates((tplRes.data ?? []) as Template[]);
    const cmap: Record<string, Completion> = {};
    for (const c of (compRes.data ?? []) as Completion[]) cmap[c.template_id] = c;
    setCompletions(cmap);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, dateStr]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("routines-fixed-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "routine_templates", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "routine_completions", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [user, dateStr]);

  // Build per-day Routine[] view
  const routines: Routine[] = useMemo(() => templates.map((t) => {
    const c = completions[t.id];
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      scheduled_time: t.start_time,
      end_time: t.end_time,
      priority: t.priority,
      category: t.category,
      completed: !!c?.completed,
      skipped: !!c?.skipped,
      source: t.source,
      prayer_key: t.prayer_key,
    };
  }), [templates, completions]);

  const upsertCompletion = async (templateId: string, patch: Partial<{ completed: boolean; skipped: boolean; completed_at: string | null }>) => {
    if (!user) return;
    const existing = completions[templateId];
    const next = {
      user_id: user.id,
      template_id: templateId,
      completion_date: dateStr,
      completed: patch.completed ?? existing?.completed ?? false,
      skipped: patch.skipped ?? existing?.skipped ?? false,
      completed_at: patch.completed_at !== undefined ? patch.completed_at : (patch.completed ? new Date().toISOString() : null),
    };
    setCompletions((prev) => ({ ...prev, [templateId]: { template_id: templateId, completed: next.completed, skipped: next.skipped } }));
    const { error } = await supabase
      .from("routine_completions")
      .upsert(next, { onConflict: "template_id,completion_date" });
    if (error) { toast.error("আপডেট ব্যর্থ"); load(); }
  };

  const toggle = (r: Routine) => upsertCompletion(r.id, { completed: !r.completed, skipped: false });
  const skipToday = (r: Routine) => {
    upsertCompletion(r.id, { skipped: !r.skipped, completed: false });
    toast.success(r.skipped ? "স্কিপ বাতিল" : "আজকের জন্য স্কিপ করা হলো");
  };

  const handleDelete = async () => {
    if (!deleting) return;
    if (deleting.source === "prayer") {
      toast.error("নামাযের রুটিন এখান থেকে মুছা যাবে না — নামায পেজ থেকে নিয়ন্ত্রণ করুন");
      setDeleting(null);
      return;
    }
    // Soft-delete: archive so completion history stays for analytics
    const { error } = await supabase
      .from("routine_templates")
      .update({ active: false, archived_at: new Date().toISOString() })
      .eq("id", deleting.id);
    if (error) toast.error(error.message);
    else toast.success("রুটিন আর্কাইভ করা হলো (পূর্বের ইতিহাস সংরক্ষিত)");
    setDeleting(null);
    load();
  };

  // Stats
  const stats = useMemo(() => {
    const total = routines.length;
    const done = routines.filter((r) => r.completed).length;
    const skipped = routines.filter((r) => r.skipped).length;
    const effective = total - skipped;
    const percent = effective ? Math.round((done / effective) * 100) : 0;
    return { total, done, skipped, percent };
  }, [routines]);

  const isToday = toLocalDateStr(now) === dateStr;
  const dayName = BN_DAYS_FULL[date.getDay()];

  // Active & next routine (today only)
  const { active, next } = useMemo(() => {
    if (!isToday) return { active: null as Routine | null, next: null as Routine | null };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const withTime = routines
      .filter((r) => r.scheduled_time)
      .map((r) => {
        const [sh, sm] = r.scheduled_time!.split(":").map(Number);
        const startMin = sh * 60 + sm;
        let endMin = startMin + 30;
        if (r.end_time) { const [eh, em] = r.end_time.split(":").map(Number); endMin = eh * 60 + em; }
        return { r, startMin, endMin };
      })
      .sort((a, b) => a.startMin - b.startMin);
    const a = withTime.find((x) => nowMin >= x.startMin && nowMin < x.endMin && !x.r.skipped) ?? null;
    const n = withTime.find((x) => x.startMin > nowMin && !x.r.skipped) ?? null;
    return { active: a?.r ?? null, next: n?.r ?? null };
  }, [routines, now, isToday]);

  const shiftDay = (n: number) => { const d = new Date(date); d.setDate(d.getDate() + n); setDate(d); };

  const editingFormData: RoutineTemplateFormData | null = editing ? {
    id: editing.id,
    name: editing.name,
    description: editing.description,
    start_time: editing.start_time,
    end_time: editing.end_time,
    priority: editing.priority,
    category: editing.category,
  } : null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">দৈনিক রুটিন</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              একবার সেট করুন — প্রতিদিন স্বয়ংক্রিয়ভাবে চলবে
            </p>
          </div>
          <Button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="press bg-gradient-accent text-accent-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" /> নতুন রুটিন
          </Button>
        </div>

        {/* Active / Next strip (today only) */}
        {isToday && (active || next) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {active && (
              <Card className="relative overflow-hidden p-4 shadow-soft border-accent/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-accent opacity-20 blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent shadow-glow">
                    <Activity className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-accent font-semibold">এখন চলছে</p>
                    <h4 className="truncate text-sm font-bold">{active.name}</h4>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-en">
                        {formatBnTime(active.scheduled_time)}{active.end_time && <> – {formatBnTime(active.end_time)}</>}
                      </span>
                    </p>
                  </div>
                </div>
              </Card>
            )}
            {next && (
              <Card className="relative overflow-hidden p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">পরবর্তী</p>
                    <h4 className="truncate text-sm font-bold">{next.name}</h4>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-en">
                        {formatBnTime(next.scheduled_time)}{next.end_time && <> – {formatBnTime(next.end_time)}</>}
                      </span>
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Date navigator */}
        <Card className="p-4 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)} className="press">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{dayName}</span>
                {isToday && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">আজ</span>}
                {!isToday && (
                  <button onClick={() => setDate(new Date())} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/70 inline-flex items-center gap-1">
                    <RotateCcw className="h-2.5 w-2.5" /> আজে ফিরুন
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-base font-semibold">{formatBnDate(date)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => shiftDay(1)} className="press">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">দিনের অগ্রগতি</span>
              <span className="font-semibold text-foreground font-en">
                {toBn(stats.done)} / {toBn(stats.total - stats.skipped)} ({toBn(stats.percent)}%)
                {stats.skipped > 0 && <span className="ml-1 text-muted-foreground">• স্কিপ {toBn(stats.skipped)}</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-accent transition-spring" style={{ width: `${stats.percent}%` }} />
            </div>
          </div>
        </Card>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : routines.length === 0 ? (
          <Card className="border-dashed border-2 border-border/60 p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">এখনও কোনো রুটিন তৈরি হয়নি</h3>
            <p className="mt-1 text-sm text-muted-foreground">আপনার দৈনিক টাইমটেবিল তৈরি করুন — প্রতিদিন স্বয়ংক্রিয়ভাবে আসবে</p>
            <Button className="mt-4 press" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> প্রথম রুটিন যোগ করুন
            </Button>
          </Card>
        ) : (
          <div className="animate-fade-in">
            <RoutineTimeline
              routines={routines}
              date={date}
              onToggle={toggle}
              onEdit={(rt) => {
                const tpl = templates.find((t) => t.id === rt.id);
                if (!tpl) return;
                if (tpl.source === "prayer") {
                  toast.info("নামায পেজ থেকে এডিট করুন");
                  return;
                }
                setEditing(tpl); setDialogOpen(true);
              }}
              onDelete={(rt) => {
                const tpl = templates.find((t) => t.id === rt.id);
                if (!tpl) return;
                if (tpl.source === "prayer") {
                  toast.error("নামাযের রুটিন এখান থেকে মুছা যাবে না — নামায পেজ থেকে নিয়ন্ত্রণ করুন");
                  return;
                }
                setDeleting(tpl);
              }}
              onSkip={skipToday}
            />
          </div>
        )}
      </div>

      <RoutineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingFormData}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>রুটিনটি আর্কাইভ করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.name}" — এটি আর প্রতিদিনের তালিকায় আসবে না, তবে অ্যানালিটিক্সের জন্য পূর্বের ইতিহাস সংরক্ষিত থাকবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="press bg-destructive text-destructive-foreground hover:bg-destructive/90">
              আর্কাইভ করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Routines;
