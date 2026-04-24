import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "primary" | "accent" | "success" | "warning";
}

const accentMap = {
  primary: "from-primary/10 to-primary/5 text-primary",
  accent: "from-accent/15 to-accent/5 text-accent",
  success: "from-success/15 to-success/5 text-success",
  warning: "from-warning/15 to-warning/5 text-warning",
};

export const StatCard = ({ label, value, hint, icon: Icon, trend, accent = "accent" }: StatCardProps) => {
  return (
    <Card className="group relative overflow-hidden border-border/60 p-5 hover-lift">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${accentMap[accent]} opacity-60 blur-xl transition-smooth group-hover:opacity-100`} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="font-en text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accentMap[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {trend && (
        <div className="relative mt-4 flex items-center gap-1 text-xs">
          {trend.positive ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className={trend.positive ? "text-success font-medium" : "text-destructive font-medium"}>
            {trend.value}
          </span>
          <span className="text-muted-foreground">গত সপ্তাহের তুলনায়</span>
        </div>
      )}
    </Card>
  );
};