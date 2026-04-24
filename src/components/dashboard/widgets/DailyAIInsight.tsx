import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Target, Flame, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Insight {
  summary: string;
  productivity: string;
  habit: string;
  spending: string;
}

export const DailyAIInsight = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Insight | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("dashboard-insights", { body: {} });
      if (error) throw error;
      if (r?.error) throw new Error(r.error);
      setData(r as Insight);
    } catch (e: any) {
      toast.error(e.message || "অন্তর্দৃষ্টি তৈরি করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden p-6 shadow-soft glass">
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-accent opacity-20 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent shadow-glow">
              <Sparkles className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">আজকের AI অন্তর্দৃষ্টি</h3>
              <p className="text-xs text-muted-foreground font-medium">ব্যক্তিগত ফোকাস ও পরামর্শ</p>
            </div>
          </div>
          <Button
            size="sm"
            variant={data ? "outline" : "default"}
            onClick={generate}
            disabled={loading}
            className={cn("press", !data && "bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow")}
          >
            {loading ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {data ? "রিফ্রেশ" : "বিশ্লেষণ"}
          </Button>
        </div>

        {loading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-3/4 rounded-lg" />
          </div>
        ) : data ? (
          <div className="space-y-3 animate-fade-in">
            <div className="rounded-lg border border-border/60 bg-card/80 p-4">
              <p className="text-sm leading-relaxed text-foreground">{data.summary}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="flex gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3">
                <Target className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-accent">ফোকাস</p>
                  <p className="text-xs leading-relaxed text-foreground/90">{data.productivity}</p>
                </div>
              </div>
              <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <Flame className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-warning">অভ্যাস</p>
                  <p className="text-xs leading-relaxed text-foreground/90">{data.habit}</p>
                </div>
              </div>
              <div className="flex gap-2 rounded-lg border border-success/30 bg-success/10 p-3">
                <Wallet className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-success">খরচ</p>
                  <p className="text-xs leading-relaxed text-foreground/90">{data.spending}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-6 text-center">
            <p className="text-sm text-foreground/80 font-medium">
              আজকের productivity, অভ্যাস ও খরচ নিয়ে AI পরামর্শ পেতে বাটনে ক্লিক করুন
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};