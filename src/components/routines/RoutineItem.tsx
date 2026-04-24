// Shared shape used across the daily routine UI.
// Represents a fixed template merged with today's completion state.
export interface Routine {
  id: string;              // template id
  name: string;
  description: string | null;
  scheduled_time: string | null;  // start time (kept name for backward-compat in timeline)
  end_time: string | null;
  priority: "low" | "medium" | "high";
  category: string | null;
  completed: boolean;
  skipped?: boolean;
  source?: "manual" | "prayer";
  prayer_key?: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | null;
}
