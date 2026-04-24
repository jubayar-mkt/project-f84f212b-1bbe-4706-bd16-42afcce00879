import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDateStr, toBn } from "@/lib/bangla";
import { BanglaDatePicker } from "@/components/ui/bangla-date-picker";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalId: string;
  goalName: string;
  onSaved: () => void;
}

const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 200, 500, 1000];

export const DepositDialog = ({ open, onOpenChange, goalId, goalName, onSaved }: Props) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toLocalDateStr(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setDate(toLocalDateStr(new Date()));
      setNote("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("বৈধ পরিমাণ দিন");

    setSaving(true);
    const { error } = await supabase.from("savings_deposits").insert({
      user_id: user.id,
      goal_id: goalId,
      amount: amt,
      deposit_date: date,
      note: note.trim() || null,
    });
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    // Sync goal completed state based on total deposits vs target
    const [{ data: goal }, { data: deps }] = await Promise.all([
      supabase.from("savings_goals").select("target_amount, completed").eq("id", goalId).maybeSingle(),
      supabase.from("savings_deposits").select("amount").eq("goal_id", goalId),
    ]);
    if (goal) {
      const total = (deps ?? []).reduce((s, d: any) => s + Number(d.amount), 0);
      const shouldComplete = total >= Number(goal.target_amount);
      if (shouldComplete && !goal.completed) {
        await supabase
          .from("savings_goals")
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq("id", goalId);
        toast.success("🎉 গোল পূর্ণ হয়েছে!");
      } else if (!shouldComplete && goal.completed) {
        await supabase
          .from("savings_goals")
          .update({ completed: false, completed_at: null })
          .eq("id", goalId);
      }
    }

    setSaving(false);
    toast.success(`৳${toBn(amt)} যোগ হয়েছে`);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>সঞ্চয় যোগ করুন</DialogTitle>
          <DialogDescription>{goalName}-এ টাকা জমা দিন</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>দ্রুত পরিমাণ</Label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition-spring press ${
                    amount === String(a)
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border/60 bg-muted/30 text-foreground hover:bg-muted"
                  }`}
                >
                  ৳{toBn(a)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>পরিমাণ (৳)</Label>
            <Input
              type="number" inputMode="decimal" placeholder="০"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="font-en text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>তারিখ</Label>
            <BanglaDatePicker value={date} onChange={(v) => setDate(v || toLocalDateStr(new Date()))} />
          </div>

          <div className="space-y-2">
            <Label>নোট (ঐচ্ছিক)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="বিস্তারিত..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleSave} disabled={saving} className="press">
            {saving ? "সংরক্ষণ হচ্ছে..." : "যোগ করুন"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
