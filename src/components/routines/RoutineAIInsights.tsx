import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, AlertTriangle, Info, CheckCircle2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Highlight {
  title: string;
  detail: string;
  severity: "info" | "warning" | "success";
}
interface Insights {
  summary: string;
  highlights: Highlight[];
  tips: string[];
}

const sevMap = {
  info: { icon: Info, cls: "text-primary bg-primary/10 border-primary/20" },
  warning: { icon: AlertTriangle, cls: "text-warning bg-warning/10 border-warning/20" },
  success: { icon: CheckCircle2, cls: "text-success bg-success/10 border-success/20" },
};

interface Props {
  startDate: string;
  endDate: string;
}

export const RoutineAIInsights = ({ startDate, endDate }: Props) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("routine-insights", {
        body: { startDate, endDate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data as Insights);
    } catch (e: any) {
      toast.error(e.message || "অন্তর্দৃষ্টি তৈরি করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden p-6 shadow-soft glass">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-accent opacity-20 blur-3xl" />
      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent shadow-glow">
              <Sparkles className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold">AI রুটিন অন্তর্দৃষ্টি</h3>
              <p className="text-xs text-muted-foreground">নির্বাচিত সময়কালের productivity বিশ্লেষণ</p>
            </div>
          </div>
          <Button
            size="sm"
            variant={insights ? "outline" : "default"}
            onClick={generate}
            disabled={loading}
            className={cn(
              "press",
              !insights && "bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow",
            )}
          >
            {loading ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {insights ? "রিফ্রেশ" : "বিশ্লেষণ করুন"}
          </Button>
        </div>

        {loading && !insights ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : insights ? (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-lg border border-border/50 bg-card/60 p-4">
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>
            {insights.highlights.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">মূল পর্যবেক্ষণ</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {insights.highlights.map((h, i) => {
                    const { icon: Icon, cls } = sevMap[h.severity] ?? sevMap.info;
                    return (
                      <div key={i} className={cn("flex gap-2.5 rounded-lg border p-3", cls)}>
                        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-semibold">{h.title}</p>
                          <p className="text-xs opacity-90 leading-relaxed">{h.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {insights.tips.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">পরামর্শ</p>
                <ul className="space-y-1.5">
                  {insights.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              আপনার productivity প্যাটার্ন ও উন্নতির পরামর্শ পেতে বাটনে ক্লিক করুন।
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};