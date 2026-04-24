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
import { BanglaDatePicker } from "@/components/ui/bangla-date-picker";
import { toLocalDateStr } from "@/lib/bangla";

export interface PaymentFormData {
  id?: string;
  shop_name: string;
  payment_date: string;
  paid_amount: number;
  payment_method?: string | null;
  note?: string | null;
}

const schema = z.object({
  shop_name: z.string().trim().min(1, "দোকানের নাম দিন").max(80),
  payment_date: z.string().min(1),
  paid_amount: z.number().min(0.01, "পরিমাণ দিন"),
  payment_method: z.string().trim().max(40).optional(),
  note: z.string().trim().max(300).optional(),
});

const METHODS = ["নগদ", "বিকাশ", "নগদ (Nagad)", "রকেট", "ব্যাংক ট্রান্সফার", "চেক", "অন্যান্য"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: PaymentFormData | null;
  shopSuggestions?: string[];
  defaultShop?: string;
  onSaved: () => void;
}

export const PaymentDialog = ({ open, onOpenChange, initial, shopSuggestions = [], defaultShop, onSaved }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PaymentFormData>({
    shop_name: defaultShop ?? "",
    payment_date: toLocalDateStr(new Date()),
    paid_amount: 0,
    payment_method: "নগদ",
    note: "",
  });

  useEffect(() => {
    if (open) {
      setForm(
        initial ?? {
          shop_name: defaultShop ?? "",
          payment_date: toLocalDateStr(new Date()),
          paid_amount: 0,
          payment_method: "নগদ",
          note: "",
        }
      );
    }
  }, [open, initial, defaultShop]);

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
      shop_name: parsed.data.shop_name,
      payment_date: parsed.data.payment_date,
      paid_amount: parsed.data.paid_amount,
      payment_method: parsed.data.payment_method || null,
      note: parsed.data.note || null,
    };
    const { error } = initial?.id
      ? await supabase.from("shop_payments").update(payload).eq("id", initial.id)
      : await supabase.from("shop_payments").insert(payload);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial?.id ? "পেমেন্ট আপডেট হয়েছে" : "পেমেন্ট যোগ হয়েছে ✓");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "পেমেন্ট এডিট করুন" : "পেমেন্ট যোগ করুন"}</DialogTitle>
          <DialogDescription>দোকানে পরিশোধিত টাকার তথ্য</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-shop">দোকান *</Label>
              <Input id="p-shop" list="p-shop-list" value={form.shop_name}
                onChange={(e) => setForm({ ...form, shop_name: e.target.value })} placeholder="দোকানের নাম" />
              <datalist id="p-shop-list">
                {shopSuggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>তারিখ *</Label>
              <BanglaDatePicker value={form.payment_date}
                onChange={(v) => setForm({ ...form, payment_date: v || toLocalDateStr(new Date()) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-amt">পরিশোধিত ৳ *</Label>
              <Input id="p-amt" type="number" min={0} step="any" inputMode="decimal" value={form.paid_amount}
                onChange={(e) => setForm({ ...form, paid_amount: parseFloat(e.target.value) || 0 })}
                className="font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label>পদ্ধতি</Label>
              <Select value={form.payment_method ?? ""} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-note">নোট (ঐচ্ছিক)</Label>
            <Textarea id="p-note" value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="press">বাতিল</Button>
          <Button onClick={handleSave} disabled={loading} className="press bg-gradient-to-r from-success to-accent text-accent-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initial?.id ? "আপডেট" : "যোগ করুন")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
