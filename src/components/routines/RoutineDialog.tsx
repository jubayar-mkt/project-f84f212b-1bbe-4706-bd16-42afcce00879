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
import { BanglaTimePicker } from "@/components/ui/bangla-time-picker";

export interface RoutineTemplateFormData {
  id?: string;
  name: string;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  priority: "low" | "medium" | "high";
  category?: string | null;
}

const schema = z.object({
  name: z.string().trim().min(1, "নাম দিন").max(120),
  description: z.string().trim().max(500).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  category: z.string().trim().max(40).optional(),
}).refine(
  (v) => {
    if (v.start_time && v.end_time) return v.end_time > v.start_time;
    return true;
  },
  { message: "শেষের সময় শুরুর সময়ের পরে হতে হবে", path: ["end_time"] },
);

const CATEGORIES = ["পড়াশোনা", "কাজ", "খেলা", "বিশ্রাম", "স্বাস্থ্য", "ব্যক্তিগত", "পরিবার", "অন্যান্য"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: RoutineTemplateFormData | null;
  onSaved: () => void;
}

export const RoutineDialog = ({ open, onOpenChange, initial, onSaved }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RoutineTemplateFormData>({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
    priority: "medium",
    category: "",
  });

  useEffect(() => {
    if (open) {
      setForm(
        initial ?? {
          name: "",
          description: "",
          start_time: "",
          end_time: "",
          priority: "medium",
          category: "",
        }
      );
    }
  }, [open, initial]);

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
      start_time: parsed.data.start_time || null,
      end_time: parsed.data.end_time || null,
      priority: parsed.data.priority,
      category: parsed.data.category || null,
      active: true,
    };

    const { error } = initial?.id
      ? await supabase.from("routine_templates").update(payload).eq("id", initial.id)
      : await supabase.from("routine_templates").insert(payload);

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial?.id ? "রুটিন আপডেট হয়েছে — আগামীকাল থেকে প্রযোজ্য" : "নতুন রুটিন যোগ হয়েছে ✨ প্রতিদিন স্বয়ংক্রিয়ভাবে চলবে");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "রুটিন এডিট করুন" : "নতুন দৈনিক রুটিন"}</DialogTitle>
          <DialogDescription>একবার যোগ করুন, প্রতিদিন স্বয়ংক্রিয়ভাবে আসবে</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">নাম *</Label>
            <Input id="r-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: সকালে পড়াশোনা" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-desc">নোট (ঐচ্ছিক)</Label>
            <Textarea id="r-desc" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="বিস্তারিত..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-time-start">শুরুর সময় *</Label>
              <BanglaTimePicker
                id="r-time-start"
                value={form.start_time ?? ""}
                onChange={(v) => setForm({ ...form, start_time: v || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-time-end">শেষের সময় *</Label>
              <BanglaTimePicker
                id="r-time-end"
                value={form.end_time ?? ""}
                onChange={(v) => setForm({ ...form, end_time: v || null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ক্যাটাগরি</Label>
              <Select value={form.category ?? ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>প্রায়োরিটি</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as "low" | "medium" | "high" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">নিম্ন</SelectItem>
                  <SelectItem value="medium">মাঝারি</SelectItem>
                  <SelectItem value="high">উচ্চ</SelectItem>
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
