import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Pencil, Trash2 } from "lucide-react";
import { formatBnTime } from "@/lib/bangla";
import { cn } from "@/lib/utils";

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  scheduled_time: string | null;
  end_time: string | null;
  priority: "low" | "medium" | "high";
  category: string | null;
  scheduled_date: string;
  completed: boolean;
}

const priorityStyle = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-accent/15 text-accent border-accent/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};
const priorityLabel = { low: "নিম্ন", medium: "মাঝারি", high: "উচ্চ" };

interface Props {
  routine: Routine;
  onToggle: (r: Routine) => void;
  onEdit: (r: Routine) => void;
  onDelete: (r: Routine) => void;
}

export const RoutineItem = ({ routine, onToggle, onEdit, onDelete }: Props) => {
  const time = formatBnTime(routine.scheduled_time);
  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 transition-smooth hover:shadow-elegant",
        routine.completed && "opacity-60"
      )}
    >
      <Checkbox
        checked={routine.completed}
        onCheckedChange={() => onToggle(routine)}
        className="mt-1 h-5 w-5 data-[state=checked]:bg-accent data-[state=checked]:border-accent transition-spring"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className={cn("text-sm font-medium text-foreground", routine.completed && "line-through")}>
            {routine.name}
          </h4>
          <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 h-4", priorityStyle[routine.priority])}>
            {priorityLabel[routine.priority]}
          </Badge>
          {routine.category && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{routine.category}</Badge>
          )}
        </div>
        {routine.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{routine.description}</p>
        )}
        {time && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-en">{time}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 opacity-0 transition-smooth group-hover:opacity-100">
        <Button variant="ghost" size="icon" className="h-7 w-7 press" onClick={() => onEdit(routine)} aria-label="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 press text-destructive" onClick={() => onDelete(routine)} aria-label="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};