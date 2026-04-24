import { supabase } from "@/integrations/supabase/client";

export const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export const PRAYER_BN: Record<PrayerKey, string> = {
  fajr: "ফজর",
  dhuhr: "যোহর",
  asr: "আসর",
  maghrib: "মাগরিব",
  isha: "এশা",
};

/** Default duration of a prayer routine block (minutes). */
export const PRAYER_DURATION_MIN = 15;

const toMin = (t?: string | null): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const minToHHMM = (mins: number) => {
  const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
};

export interface TimeSpan {
  id?: string;
  start: string; // HH:MM or HH:MM:SS
  end?: string | null;
}

/** Returns true if [aStart, aEnd) overlaps [bStart, bEnd). */
export const spansOverlap = (a: TimeSpan, b: TimeSpan, defaultDuration = PRAYER_DURATION_MIN): boolean => {
  const as = toMin(a.start); if (as == null) return false;
  const bs = toMin(b.start); if (bs == null) return false;
  const ae = toMin(a.end ?? null) ?? as + defaultDuration;
  const be = toMin(b.end ?? null) ?? bs + defaultDuration;
  return as < be && bs < ae;
};

/** Detects which existing templates conflict with the given span (excluding `excludeId`). */
export interface ConflictTemplate {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  source: "manual" | "prayer";
}

export const findConflicts = async (
  userId: string,
  span: { start: string; end?: string | null },
  excludeId?: string,
): Promise<ConflictTemplate[]> => {
  const { data } = await supabase
    .from("routine_templates")
    .select("id,name,start_time,end_time,source")
    .eq("user_id", userId)
    .is("archived_at", null);
  const list = (data ?? []) as ConflictTemplate[];
  return list.filter(
    (t) =>
      t.id !== excludeId &&
      t.start_time &&
      spansOverlap(
        { start: t.start_time, end: t.end_time },
        { start: span.start, end: span.end ?? null },
      ),
  );
};

/** Sync a single prayer with the routine_templates table. Returns conflicts (caller decides). */
export const syncPrayerRoutine = async (
  userId: string,
  key: PrayerKey,
  time: string | null,
): Promise<{ conflicts: ConflictTemplate[] }> => {
  // Find current prayer template
  const { data: existing } = await supabase
    .from("routine_templates")
    .select("id,name,start_time,end_time,source")
    .eq("user_id", userId)
    .eq("prayer_key", key)
    .is("archived_at", null)
    .maybeSingle();

  // No time => archive existing prayer routine
  if (!time) {
    if (existing) {
      await supabase
        .from("routine_templates")
        .update({ archived_at: new Date().toISOString(), active: false })
        .eq("id", existing.id);
    }
    return { conflicts: [] };
  }

  const startHHMM = time.length === 5 ? `${time}:00` : time;
  const startMin = toMin(startHHMM)!;
  const endHHMM = minToHHMM(startMin + PRAYER_DURATION_MIN);

  // Conflict check (excluding the existing prayer template)
  const conflicts = await findConflicts(userId, { start: startHHMM, end: endHHMM }, existing?.id);
  if (conflicts.length > 0) return { conflicts };

  const payload = {
    user_id: userId,
    name: `নামায — ${PRAYER_BN[key]}`,
    description: "স্বয়ংক্রিয়ভাবে নামাযের সময় থেকে যোগ হয়েছে",
    start_time: startHHMM,
    end_time: endHHMM,
    category: "নামায",
    priority: "high" as const,
    source: "prayer" as const,
    prayer_key: key,
    active: true,
  };

  if (existing) {
    await supabase.from("routine_templates").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("routine_templates").insert(payload);
  }
  return { conflicts: [] };
};
