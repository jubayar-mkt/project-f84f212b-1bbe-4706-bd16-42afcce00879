import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { toLocalDateStr } from "@/lib/bangla";
import { BanglaDatePicker } from "@/components/ui/bangla-date-picker";

export interface RoutineFormData {
  id?: string;
  name: string;
  description?: string | null;
  scheduled_time?: string | null;
  priority: "low" | "medium" | "high";
  category?: string | null;
  scheduled_date: string;
}

const schema = z.object({
  name: z.string().trim().min(1, "নাম দিন").max(120),
  description: z.string().trim().max(500).optional(),
  scheduled_time: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  category: z.string().trim().max(40).optional(),
  scheduled_date: z.string().min(1),
});

const CATEGORIES = ["কাজ", "পড়াশোনা", "স্বাস্থ্য", "ব্যক্তিগত", "পরিবার", "অন্যান্য"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: RoutineFormData | null;
  defaultDate?: Date;
  onSaved: () => void;
}

export const RoutineDialog = ({ open, onOpenChange, initial, defaultDate, onSaved }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RoutineFormData>({
    name: "",
    description: "",
    scheduled_time: "",
    priority: "medium",
    category: "",
    scheduled_date: toLocalDateStr(defaultDate ?? new Date()),
  });

  useEffect(() => {
    if (open) {
      setForm(
        initial ?? {
          name: "",
          description: "",
          scheduled_time: "",
          priority: "medium",
          category: "",
          scheduled_date: toLocalDateStr(defaultDate ?? new Date()),
        }
      );
    }
  }, [open, initial, defaultDate]);

  const handleSave = async () => {
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const payload = {
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      scheduled_time: parsed.data.scheduled_time || null,
      priority: parsed.data.priority,
      category: parsed.data.category || null,
      scheduled_date: parsed.data.scheduled_date,
    };

    const { error } = initial?.id
      ? await supabase.from("routines").update(payload).eq("id", initial.id)
      : await supabase.from("routines").insert(payload);

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial?.id ? "রুটিন আপডেট হয়েছে" : "নতুন রুটিন যোগ হয়েছে ✨");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "রুটিন এডিট করুন" : "নতুন রুটিন"}</DialogTitle>
          <DialogDescription>আপনার দিনের একটি কাজ যোগ করুন</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">নাম *</Label>
            <Input id="r-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: সকালে হাঁটা" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-desc">বিবরণ</Label>
            <Textarea id="r-desc" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="বিস্তারিত..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-date">তারিখ</Label>
              <BanglaDatePicker
                id="r-date"
                value={form.scheduled_date}
                onChange={(v) => setForm({ ...form, scheduled_date: v || toLocalDateStr(new Date()) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-time">সময়</Label>
              <Input id="r-time" type="time" value={form.scheduled_time ?? ""} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>অগ্রাধিকার</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as "low" | "medium" | "high" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">নিম্ন</SelectItem>
                  <SelectItem value="medium">মাঝারি</SelectItem>
                  <SelectItem value="high">উচ্চ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ক্যাটাগরি</Label>
              <Select value={form.category ?? ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="press">বাতিল</Button>
          <Button onClick={handleSave} disabled={loading} className="press bg-gradient-accent text-accent-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initial?.id ? "আপডেট" : "যোগ করুন")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};