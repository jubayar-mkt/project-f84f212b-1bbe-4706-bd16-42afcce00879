import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { HabitDialog, HabitFormData } from "@/components/habits/HabitDialog";
import { HabitCard, Habit, CheckIn } from "@/components/habits/HabitCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toLocalDateStr } from "@/lib/bangla";

const Habits = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [deleting, setDeleting] = useState<Habit | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [hRes, cRes] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).order("created_at", { ascending: true }),
      supabase.from("habit_checkins").select("habit_id, checkin_date, count").eq("user_id", user.id),
    ]);
    setLoading(false);
    if (hRes.error) { toast.error(hRes.error.message); return; }
    if (cRes.error) { toast.error(cRes.error.message); return; }
    setHabits((hRes.data ?? []) as Habit[]);
    setCheckins((cRes.data ?? []) as CheckIn[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("habits-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "habit_checkins", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  const handleCheckIn = async (h: Habit) => {
    if (!user) return;
    const today = toLocalDateStr(new Date());
    const existing = checkins.find((c) => c.habit_id === h.id && c.checkin_date === today);
    if (existing) {
      // Increment count
      const newCount = Math.min(existing.count + 1, h.target_per_day);
      const { error } = await supabase
        .from("habit_checkins")
        .update({ count: newCount })
        .eq("habit_id", h.id)
        .eq("checkin_date", today);
      if (error) toast.error(error.message);
      else if (newCount >= h.target_per_day) toast.success("চমৎকার! আজকের লক্ষ্য পূরণ ✨");
    } else {
      const { error } = await supabase
        .from("habit_checkins")
        .insert({ user_id: user.id, habit_id: h.id, checkin_date: today, count: 1 });
      if (error) toast.error(error.message);
      else if (h.target_per_day === 1) toast.success("দারুণ! Streak চলছে 🔥");
    }
    load();
  };

  const handleUncheck = async (h: Habit) => {
    const today = toLocalDateStr(new Date());
    const { error } = await supabase
      .from("habit_checkins")
      .delete()
      .eq("habit_id", h.id)
      .eq("checkin_date", today);
    if (error) toast.error(error.message);
    load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("habits").delete().eq("id", deleting.id);
    if (error) toast.error(error.message);
    else toast.success("অভ্যাস মুছে ফেলা হয়েছে");
    setDeleting(null);
    load();
  };

  const editingForm: HabitFormData | null = editing
    ? {
        id: editing.id,
        name: editing.name,
        description: editing.description,
        category: editing.category,
        color: editing.color,
        target_per_day: editing.target_per_day,
      }
    : null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">অভ্যাস ট্র্যাকার</h1>
            <p className="mt-1 text-sm text-muted-foreground">প্রতিদিন একটু একটু করে গড়ুন স্থায়ী অভ্যাস</p>
          </div>
          <Button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="press bg-gradient-accent text-accent-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" /> নতুন অভ্যাস
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
          </div>
        ) : habits.length === 0 ? (
          <Card className="border-dashed border-2 border-border/60 p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-base font-semibold">কোনো অভ্যাস নেই</h3>
            <p className="mt-1 text-sm text-muted-foreground">প্রথম অভ্যাস যোগ করে যাত্রা শুরু করুন</p>
            <Button className="mt-4 press" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> অভ্যাস যোগ করুন
            </Button>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 animate-fade-in">
            {habits.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                checkins={checkins}
                onCheckIn={handleCheckIn}
                onUncheck={handleUncheck}
                onEdit={(ht) => { setEditing(ht); setDialogOpen(true); }}
                onDelete={(ht) => setDeleting(ht)}
              />
            ))}
          </div>
        )}
      </div>

      <HabitDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editingForm} onSaved={load} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>অভ্যাসটি মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.name}" — সমস্ত check-in history-ও মুছে যাবে।
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

export default Habits;