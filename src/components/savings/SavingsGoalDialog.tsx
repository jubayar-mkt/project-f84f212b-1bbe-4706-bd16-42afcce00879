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
import { BanglaDatePicker } from "@/components/ui/bangla-date-picker";

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
  note: string | null;
  completed: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goal?: SavingsGoal | null;
  onSaved: () => void;
}

const COLOR_OPTIONS = [
  { value: "success", label: "সবুজ", className: "bg-success" },
  { value: "primary", label: "নীল", className: "bg-primary" },
  { value: "accent", label: "অ্যাকসেন্ট", className: "bg-accent" },
  { value: "destructive", label: "লাল", className: "bg-destructive" },
];

export const SavingsGoalDialog = ({ open, onOpenChange, goal, onSaved }: Props) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState<string>("");
  const [color, setColor] = useState("success");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(goal?.name ?? "");
      setTarget(goal ? String(goal.target_amount) : "");
      setDeadline(goal?.deadline ?? "");
      setColor(goal?.color ?? "success");
      setNote(goal?.note ?? "");
    }
  }, [open, goal]);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("গোলের নাম দিন");
    const amt = parseFloat(target);
    if (!amt || amt <= 0) return toast.error("বৈধ লক্ষ্য পরিমাণ দিন");

    setSaving(true);
    const payload = {
      user_id: user.id,
      name: name.trim(),
      target_amount: amt,
      deadline: deadline || null,
      color,
      note: note.trim() || null,
    };
    const { error } = goal
      ? await supabase.from("savings_goals").update(payload).eq("id", goal.id)
      : await supabase.from("savings_goals").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(goal ? "আপডেট হয়েছে" : "নতুন গোল যোগ হয়েছে");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "গোল এডিট" : "নতুন সঞ্চয় গোল"}</DialogTitle>
          <DialogDescription>একটি লক্ষ্য নির্ধারণ করে সঞ্চয় শুরু করুন</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>গোলের নাম</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: নতুন ল্যাপটপ" />
          </div>

          <div className="space-y-2">
            <Label>লক্ষ্য পরিমাণ (৳)</Label>
            <Input
              type="number" inputMode="decimal" placeholder="০"
              value={target} onChange={(e) => setTarget(e.target.value)}
              className="font-en text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>ডেডলাইন (ঐচ্ছিক)</Label>
            <BanglaDatePicker value={deadline} onChange={(v) => setDeadline(v ?? "")} />
          </div>

          <div className="space-y-2">
            <Label>রঙ</Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-9 w-9 rounded-full ${c.className} transition-spring ${
                    color === c.value ? "ring-2 ring-offset-2 ring-foreground/40 scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>নোট (ঐচ্ছিক)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="বিস্তারিত..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleSave} disabled={saving} className="press">
            {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
