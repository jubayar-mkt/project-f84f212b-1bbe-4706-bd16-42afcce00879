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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { EXPENSE_CATEGORIES } from "./TransactionDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  monthStart: string; // YYYY-MM-01
  onSaved: () => void;
}

export const BudgetDialog = ({ open, onOpenChange, monthStart, onSaved }: Props) => {
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory("");
      setLimit("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!user) return;
    if (!category) return toast.error("ক্যাটাগরি নির্বাচন করুন");
    const amt = parseFloat(limit);
    if (!amt || amt <= 0) return toast.error("বৈধ সীমা দিন");

    setSaving(true);
    const { error } = await supabase.from("budgets").upsert(
      {
        user_id: user.id,
        category,
        monthly_limit: amt,
        month: monthStart,
      },
      { onConflict: "user_id,category,month" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("বাজেট সংরক্ষিত");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>মাসিক বাজেট</DialogTitle>
          <DialogDescription>একটি ক্যাটাগরির জন্য মাসিক ব্যয় সীমা নির্ধারণ করুন</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>ক্যাটাগরি</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>মাসিক সীমা (৳)</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="০"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="font-en text-lg"
            />
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
