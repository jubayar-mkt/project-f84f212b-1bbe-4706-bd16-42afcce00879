import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BanglaDatePicker } from "@/components/ui/bangla-date-picker";
import { toLocalDateStr } from "@/lib/bangla";

export interface CreditFormData {
  id?: string;
  shop_name: string;
  purchase_date: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  note?: string | null;
}

const schema = z.object({
  shop_name: z.string().trim().min(1, "দোকানের নাম দিন").max(80),
  purchase_date: z.string().min(1),
  item_name: z.string().trim().min(1, "পণ্যের নাম দিন").max(120),
  quantity: z.number().min(0.01, "পরিমাণ দিন"),
  unit_price: z.number().min(0),
  total_amount: z.number().min(0.01, "মোট মূল্য দিন"),
  note: z.string().trim().max(300).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: CreditFormData | null;
  shopSuggestions?: string[];
  onSaved: () => void;
}

export const CreditDialog = ({ open, onOpenChange, initial, shopSuggestions = [], onSaved }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreditFormData>({
    shop_name: "",
    purchase_date: toLocalDateStr(new Date()),
    item_name: "",
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    note: "",
  });

  useEffect(() => {
    if (open) {
      setForm(
        initial ?? {
          shop_name: "",
          purchase_date: toLocalDateStr(new Date()),
          item_name: "",
          quantity: 1,
          unit_price: 0,
          total_amount: 0,
          note: "",
        }
      );
    }
  }, [open, initial]);

  // Auto compute total when qty * price changes (only if user hasn't manually overridden)
  const setQty = (q: number) => {
    const computed = +(q * form.unit_price).toFixed(2);
    setForm((f) => ({ ...f, quantity: q, total_amount: computed }));
  };
  const setPrice = (p: number) => {
    const computed = +(form.quantity * p).toFixed(2);
    setForm((f) => ({ ...f, unit_price: p, total_amount: computed }));
  };

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
      purchase_date: parsed.data.purchase_date,
      item_name: parsed.data.item_name,
      quantity: parsed.data.quantity,
      unit_price: parsed.data.unit_price,
      total_amount: parsed.data.total_amount,
      note: parsed.data.note || null,
    };
    const { error } = initial?.id
      ? await supabase.from("shop_credits").update(payload).eq("id", initial.id)
      : await supabase.from("shop_credits").insert(payload);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial?.id ? "এন্ট্রি আপডেট হয়েছে" : "নতুন বকেয়া যোগ হয়েছে");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "বকেয়া এডিট করুন" : "নতুন বকেয়া যোগ করুন"}</DialogTitle>
          <DialogDescription>দোকান থেকে বাকিতে কেনা পণ্যের তথ্য</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-shop">দোকানের নাম *</Label>
              <Input
                id="c-shop"
                list="shop-list"
                value={form.shop_name}
                onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                placeholder="যেমন: রহিম স্টোর"
              />
              <datalist id="shop-list">
                {shopSuggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>তারিখ *</Label>
              <BanglaDatePicker
                value={form.purchase_date}
                onChange={(v) => setForm({ ...form, purchase_date: v || toLocalDateStr(new Date()) })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-item">পণ্যের নাম *</Label>
            <Input id="c-item" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="যেমন: চাল ৫ কেজি" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-qty">পরিমাণ</Label>
              <Input id="c-qty" type="number" min={0} step="any" inputMode="decimal" value={form.quantity}
                onChange={(e) => setQty(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-price">প্রতি ইউনিট ৳</Label>
              <Input id="c-price" type="number" min={0} step="any" inputMode="decimal" value={form.unit_price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-total">মোট ৳ *</Label>
              <Input id="c-total" type="number" min={0} step="any" inputMode="decimal" value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })}
                className="font-semibold" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-note">নোট (ঐচ্ছিক)</Label>
            <Textarea id="c-note" value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="বিস্তারিত..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="press">বাতিল</Button>
          <Button onClick={handleSave} disabled={loading} className="press bg-gradient-to-r from-destructive to-warning text-destructive-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initial?.id ? "আপডেট" : "যোগ করুন")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
