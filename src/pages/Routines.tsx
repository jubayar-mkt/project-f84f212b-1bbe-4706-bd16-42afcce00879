import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronLeft, ChevronRight, ListTodo, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RoutineDialog } from "@/components/routines/RoutineDialog";
import { RoutineItem, Routine } from "@/components/routines/RoutineItem";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BN_DAYS_FULL, formatBnDate, toBn, toLocalDateStr } from "@/lib/bangla";

const Routines = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [deleting, setDeleting] = useState<Routine | null>(null);

  const dateStr = toLocalDateStr(date);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("user_id", user.id)
      .eq("scheduled_date", dateStr)
      .order("scheduled_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRoutines((data ?? []) as Routine[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateStr]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("routines-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routines", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateStr]);

  const toggle = async (r: Routine) => {
    const next = !r.completed;
    setRoutines((prev) => prev.map((x) => (x.id === r.id ? { ...x, completed: next } : x)));
    const { error } = await supabase
      .from("routines")
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", r.id);
    if (error) {
      toast.error("আপডেট ব্যর্থ");
      load();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("routines").delete().eq("id", deleting.id);
    if (error) toast.error(error.message);
    else toast.success("রুটিন মুছে ফেলা হয়েছে");
    setDeleting(null);
    load();
  };

  const stats = useMemo(() => {
    const total = routines.length;
    const done = routines.filter((r) => r.completed).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  }, [routines]);

  const shiftDay = (n: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d);
  };

  const isToday = toLocalDateStr(new Date()) === dateStr;
  const dayName = BN_DAYS_FULL[date.getDay()];

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">রুটিন ম্যানেজার</h1>
            <p className="mt-1 text-sm text-muted-foreground">আপনার দৈনিক কাজের সময়সূচী</p>
          </div>
          <Button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="press bg-gradient-accent text-accent-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" /> নতুন রুটিন
          </Button>
        </div>

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
              </div>
              <p className="mt-0.5 text-base font-semibold">{formatBnDate(date)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => shiftDay(1)} className="press">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">দিনের অগ্রগতি</span>
              <span className="font-semibold text-foreground font-en">
                {toBn(stats.done)} / {toBn(stats.total)} ({toBn(stats.percent)}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-accent transition-spring"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : routines.length === 0 ? (
          <Card className="border-dashed border-2 border-border/60 p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">এই দিনের জন্য কোনো রুটিন নেই</h3>
            <p className="mt-1 text-sm text-muted-foreground">নতুন রুটিন যোগ করে শুরু করুন</p>
            <Button className="mt-4 press" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> রুটিন যোগ করুন
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5 animate-fade-in">
            {routines.map((r) => (
              <RoutineItem
                key={r.id}
                routine={r}
                onToggle={toggle}
                onEdit={(rt) => { setEditing(rt); setDialogOpen(true); }}
                onDelete={(rt) => setDeleting(rt)}
              />
            ))}
          </div>
        )}
      </div>

      <RoutineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing ? {
          id: editing.id,
          name: editing.name,
          description: editing.description,
          scheduled_time: editing.scheduled_time,
          priority: editing.priority,
          category: editing.category,
          scheduled_date: editing.scheduled_date,
        } : null}
        defaultDate={date}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>রুটিনটি মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.name}" — এই কাজটি undo করা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="press bg-destructive text-destructive-foreground hover:bg-destructive/90">
              মুছুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Routines;