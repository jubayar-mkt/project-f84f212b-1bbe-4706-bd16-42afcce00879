import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDateStr } from "@/lib/bangla";

export const INCOME_CATEGORIES = ["বেতন", "ব্যবসা", "ফ্রিল্যান্স", "উপহার", "বিনিয়োগ", "অন্যান্য"];
export const EXPENSE_CATEGORIES = [
  "খাবার",
  "যাতায়াত",
  "বাসা ভাড়া",
  "বিল",
  "কর্মচারী বেতন",
  "শিক্ষা",
  "স্বাস্থ্য",
  "বিনোদন",
  "কেনাকাটা",
  "অন্যান্য",
];

export interface Txn {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string | null;
  transaction_date: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  txn?: Txn | null;
  onSaved: () => void;
}

export const TransactionDialog = ({ open, onOpenChange, txn, onSaved }: Props) => {
  const { user } = useAuth();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toLocalDateStr(new Date()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(txn?.type ?? "expense");
      setAmount(txn ? String(txn.amount) : "");
      setCategory(txn?.category ?? "");
      setNote(txn?.note ?? "");
      setDate(txn?.transaction_date ?? toLocalDateStr(new Date()));
    }
  }, [open, txn]);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSave = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("বৈধ পরিমাণ দিন");
    if (!category) return toast.error("ক্যাটাগরি নির্বাচন করুন");

    setSaving(true);
    const payload = {
      user_id: user.id,
      type,
      amount: amt,
      category,
      note: note.trim() || null,
      transaction_date: date,
    };
    const { error } = txn
      ? await supabase.from("transactions").update(payload).eq("id", txn.id)
      : await supabase.from("transactions").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(txn ? "আপডেট হয়েছে" : "যোগ হয়েছে");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{txn ? "লেনদেন এডিট" : "নতুন লেনদেন"}</DialogTitle>
          <DialogDescription>আপনার আয় বা ব্যয় যোগ করুন</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ToggleGroup
            type="single"
            value={type}
            onValueChange={(v) => v && setType(v as "income" | "expense")}
            className="grid grid-cols-2 gap-2"
          >
            <ToggleGroupItem
              value="income"
              className="data-[state=on]:bg-success data-[state=on]:text-success-foreground gap-2 border border-border/60"
            >
              <TrendingUp className="h-4 w-4" /> আয়
            </ToggleGroupItem>
            <ToggleGroupItem
              value="expense"
              className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground gap-2 border border-border/60"
            >
              <TrendingDown className="h-4 w-4" /> ব্যয়
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="space-y-2">
            <Label>পরিমাণ (৳)</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="০"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-en text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>ক্যাটাগরি</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>তারিখ</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="font-en" />
          </div>

          <div className="space-y-2">
            <Label>নোট (ঐচ্ছিক)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="বিস্তারিত..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button onClick={handleSave} disabled={saving} className="press">
            {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
