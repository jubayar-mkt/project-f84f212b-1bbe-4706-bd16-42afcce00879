import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { BanglaTimePicker } from "@/components/ui/bangla-time-picker";
import { Moon, Sun, Sunrise, Sunset, Clock, Save, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatBnTime, toBn } from "@/lib/bangla";
import { PRAYER_BN, PRAYER_KEYS, PrayerKey, syncPrayerRoutine } from "@/lib/prayer";
import { cn } from "@/lib/utils";

const ICONS: Record<PrayerKey, any> = {
  fajr: Sunrise,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: Moon,
};

const TINTS: Record<PrayerKey, string> = {
  fajr: "from-primary-glow/30 to-primary-glow/5 text-primary-glow",
  dhuhr: "from-warning/30 to-warning/5 text-warning",
  asr: "from-accent/30 to-accent/5 text-accent",
  maghrib: "from-destructive/30 to-destructive/5 text-destructive",
  isha: "from-primary/30 to-primary/5 text-primary-glow",
};

interface Settings {
  fajr_time: string | null;
  dhuhr_time: string | null;
  asr_time: string | null;
  maghrib_time: string | null;
  isha_time: string | null;
  fajr_reminder: boolean;
  dhuhr_reminder: boolean;
  asr_reminder: boolean;
  maghrib_reminder: boolean;
  isha_reminder: boolean;
}

const EMPTY: Settings = {
  fajr_time: "05:00", dhuhr_time: "13:15", asr_time: "16:30", maghrib_time: "18:15", isha_time: "19:45",
  fajr_reminder: true, dhuhr_reminder: true, asr_reminder: true, maghrib_reminder: true, isha_reminder: true,
};

const stripSec = (t: string | null) => (t ? t.slice(0, 5) : "");

const Namaz = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Settings>(EMPTY);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("prayer_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          fajr_time: stripSec(data.fajr_time),
          dhuhr_time: stripSec(data.dhuhr_time),
          asr_time: stripSec(data.asr_time),
          maghrib_time: stripSec(data.maghrib_time),
          isha_time: stripSec(data.isha_time),
          fajr_reminder: data.fajr_reminder,
          dhuhr_reminder: data.dhuhr_reminder,
          asr_reminder: data.asr_reminder,
          maghrib_reminder: data.maghrib_reminder,
          isha_reminder: data.isha_reminder,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  // Compute today's next prayer
  const upcoming = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const list = PRAYER_KEYS.map((k) => {
      const t = (form[`${k}_time` as keyof Settings] as string | null) || "";
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      return { key: k, min: h * 60 + m, time: t };
    }).filter((x): x is { key: PrayerKey; min: number; time: string } => !!x);
    const next = list.find((x) => x.min > nowMin) ?? list[0];
    const current = list.find((x) => nowMin >= x.min && nowMin < x.min + 30);
    return { next, current };
  }, [form, now]);

  const setTime = (k: PrayerKey, v: string) => setForm((f) => ({ ...f, [`${k}_time`]: v || null }));
  const setReminder = (k: PrayerKey, v: boolean) => setForm((f) => ({ ...f, [`${k}_reminder`]: v }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Persist settings
    const payload = { user_id: user.id, ...form };
    const { error } = await supabase
      .from("prayer_settings")
      .upsert(payload, { onConflict: "user_id" });
    if (error) { setSaving(false); toast.error(error.message); return; }

    // Sync each prayer with routine
    const allConflicts: { key: PrayerKey; names: string[] }[] = [];
    for (const k of PRAYER_KEYS) {
      const t = form[`${k}_time` as keyof Settings] as string | null;
      const { conflicts } = await syncPrayerRoutine(user.id, k, t || null);
      if (conflicts.length > 0) {
        allConflicts.push({ key: k, names: conflicts.map((c) => c.name) });
      }
    }

    setSaving(false);
    if (allConflicts.length > 0) {
      const msg = allConflicts
        .map((c) => `${PRAYER_BN[c.key]} → "${c.names.join(", ")}" এর সাথে conflict`)
        .join(" • ");
      toast.warning(`কিছু নামায routine হিসেবে যোগ হয়নি: ${msg}`, { duration: 7000 });
    } else {
      toast.success("নামাযের সময় সংরক্ষিত — রুটিনে স্বয়ংক্রিয়ভাবে যোগ হয়েছে ✨");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 md:p-6 shadow-soft">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-accent opacity-20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">নামায</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                আপনার দৈনিক ৫ ওয়াক্ত নামাযের সময় সেট করুন — রুটিনে স্বয়ংক্রিয়ভাবে যোগ হবে
              </p>
            </div>
            <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent shadow-glow">
              <Moon className="h-5 w-5 text-accent-foreground" />
            </div>
          </div>
        </div>

        {/* Next/current highlight */}
        {!loading && (upcoming.current || upcoming.next) && (
          <Card className="relative overflow-hidden border-accent/30 p-4 shadow-soft">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-accent opacity-15 blur-3xl animate-pulse-glow" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent shadow-glow">
                <Sparkles className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                {upcoming.current ? (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-accent font-bold">এখন চলছে</p>
                    <p className="text-base font-bold">{PRAYER_BN[upcoming.current.key]}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">পরবর্তী নামায</p>
                    <p className="text-base font-bold">
                      {PRAYER_BN[upcoming.next!.key]}{" "}
                      <span className="font-normal text-sm text-muted-foreground font-en">
                        {formatBnTime(upcoming.next!.time)}
                      </span>
                    </p>
                  </>
                )}
              </div>
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Card>
        )}

        {/* Prayer cards */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3">
            {PRAYER_KEYS.map((k) => {
              const Icon = ICONS[k];
              const tint = TINTS[k];
              const time = (form[`${k}_time` as keyof Settings] as string | null) || "";
              const reminder = form[`${k}_reminder` as keyof Settings] as boolean;
              const isNext = upcoming.next?.key === k && !upcoming.current;
              const isCurrent = upcoming.current?.key === k;

              return (
                <Card
                  key={k}
                  className={cn(
                    "group relative overflow-hidden p-4 shadow-soft transition-smooth",
                    (isNext || isCurrent) && "border-accent/40 shadow-glow",
                  )}
                >
                  <div className={cn(
                    "absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-50 blur-2xl",
                    tint.split(" ").slice(0, 2).join(" "),
                  )} />
                  <div className="relative flex flex-wrap items-center gap-4">
                    <div className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shrink-0",
                      tint.split(" ").slice(0, 2).join(" "),
                    )}>
                      <Icon className={cn("h-5 w-5", tint.split(" ").slice(2).join(" "))} />
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        {isCurrent && <span className="text-accent">● </span>}
                        নামায
                      </p>
                      <p className="text-base font-bold text-foreground">{PRAYER_BN[k]}</p>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <BanglaTimePicker
                        id={`time-${k}`}
                        value={time}
                        onChange={(v) => setTime(k, v)}
                      />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-muted-foreground font-medium">রিমাইন্ডার</span>
                      <Switch checked={reminder} onCheckedChange={(v) => setReminder(k, v)} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info + Save */}
        <Card className="border-dashed border-border/60 p-3 bg-muted/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              নামাযের রুটিন <strong>রুটিন পেজ থেকে delete করা যাবে না</strong> — শুধুমাত্র এই পেজ থেকে নিয়ন্ত্রণ করুন। যদি কোনো ম্যানুয়াল রুটিন একই সময়ে থাকে, সেটি conflict হিসেবে দেখানো হবে।
            </p>
          </div>
        </Card>

        <div className="sticky bottom-2 z-10 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            size="lg"
            className="press bg-gradient-accent text-accent-foreground shadow-glow hover:opacity-90"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Namaz;
