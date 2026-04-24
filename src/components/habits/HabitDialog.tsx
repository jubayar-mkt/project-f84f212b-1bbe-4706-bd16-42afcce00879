import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HabitFormData {
  id?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  color: string;
  target_per_day: number;
}

const schema = z.object({
  name: z.string().trim().min(1, "নাম দিন").max(80),
  description: z.string().trim().max(300).optional(),
  category: z.string().trim().max(40).optional(),
  color: z.string(),
  target_per_day: z.number().int().min(1).max(20),
});

const COLORS = [
  { id: "accent", cls: "bg-accent" },
  { id: "primary", cls: "bg-primary" },
  { id: "success", cls: "bg-success" },
  { id: "warning", cls: "bg-warning" },
  { id: "destructive", cls: "bg-destructive" },
];

const CATEGORIES = ["স্বাস্থ্য", "পড়াশোনা", "ফিটনেস", "মেডিটেশন", "কাজ", "অন্যান্য"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: HabitFormData | null;
  onSaved: () => void;
}

export const HabitDialog = ({ open, onOpenChange, initial, onSaved }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<HabitFormData>({
    name: "", description: "", category: "", color: "accent", target_per_day: 1,
  });

  useEffect(() => {
    if (open) {
      setForm(initial ?? { name: "", description: "", category: "", color: "accent", target_per_day: 1 });
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
      category: parsed.data.category || null,
      color: parsed.data.color,
      target_per_day: parsed.data.target_per_day,
    };
    const { error } = initial?.id
      ? await supabase.from("habits").update(payload).eq("id", initial.id)
      : await supabase.from("habits").insert(payload);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial?.id ? "অভ্যাস আপডেট হয়েছে" : "নতুন অভ্যাস যোগ হয়েছে ✨");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "অভ্যাস এডিট করুন" : "নতুন অভ্যাস"}</DialogTitle>
          <DialogDescription>একটি ছোট অভ্যাস বড় পরিবর্তন আনে</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="h-name">নাম *</Label>
            <Input id="h-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: প্রতিদিন ১০ পাতা পড়া" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-desc">বিবরণ</Label>
            <Textarea id="h-desc" rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
              <Label htmlFor="h-target">দৈনিক লক্ষ্য</Label>
              <Input
                id="h-target"
                type="number"
                min={1}
                max={20}
                value={form.target_per_day}
                onChange={(e) => setForm({ ...form, target_per_day: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>রং</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm({ ...form, color: c.id })}
                  className={cn(
                    "h-8 w-8 rounded-full transition-spring press",
                    c.cls,
                    form.color === c.id ? "ring-2 ring-offset-2 ring-foreground/40 scale-110" : "opacity-70 hover:opacity-100"
                  )}
                  aria-label={c.id}
                />
              ))}
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