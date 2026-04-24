import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Lock,
  Bell,
  Palette,
  Languages,
  Database,
  Download,
  Trash2,
  CheckCircle2,
  Sun,
  Moon,
  Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";

type Section = {
  icon: typeof User;
  title: string;
  description: string;
  children: React.ReactNode;
};

const SectionCard = ({ icon: Icon, title, description, children }: Section) => (
  <section className="glass rounded-2xl border border-border/60 p-5 md:p-6 shadow-soft">
    <div className="flex items-start gap-3 border-b border-border/50 pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="mt-5 space-y-5">{children}</div>
  </section>
);

const Row = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const NOTIF_KEY = "notif_prefs_v1";
type NotifPrefs = {
  habit: boolean;
  routine: boolean;
  namaz: boolean;
  streak: boolean;
};
const defaultNotif: NotifPrefs = { habit: true, routine: true, namaz: true, streak: true };

const Settings = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme, density, setDensity, fontScale, setFontScale } = useTheme();

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notifications
  const [notif, setNotif] = useState<NotifPrefs>(() => {
    if (typeof window === "undefined") return defaultNotif;
    try {
      return { ...defaultNotif, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}") };
    } catch {
      return defaultNotif;
    }
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      } else {
        setDisplayName(user.user_metadata?.display_name ?? "");
        setAvatarUrl(user.user_metadata?.avatar_url ?? "");
      }
    })();
  }, [user]);

  const updateNotif = (key: keyof NotifPrefs, val: boolean) => {
    const next = { ...notif, [key]: val };
    setNotif(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    toast.success("সেটিংস সংরক্ষিত");
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, avatar_url: avatarUrl || null })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) toast.error("সংরক্ষণ ব্যর্থ: " + error.message);
    else toast.success("প্রোফাইল আপডেট হয়েছে");
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error("ব্যর্থ: " + error.message);
    else {
      setNewPassword("");
      toast.success("পাসওয়ার্ড পরিবর্তিত হয়েছে");
    }
  };

  const exportData = async () => {
    if (!user) return;
    toast.info("ডেটা প্রস্তুত হচ্ছে…");
    const tables = [
      "habits",
      "habit_checkins",
      "routine_templates",
      "routine_completions",
      "transactions",
      "budgets",
      "prayer_settings",
    ] as const;
    const out: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
    };
    for (const t of tables) {
      const { data } = await supabase.from(t).select("*").eq("user_id", user.id);
      out[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jibonos-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ডেটা ডাউনলোড সম্পন্ন");
  };

  const clearData = async (target: "habits" | "transactions" | "routines") => {
    if (!user) return;
    const map = {
      habits: ["habit_checkins", "habits"],
      transactions: ["transactions"],
      routines: ["routine_completions", "routine_templates"],
    } as const;
    for (const t of map[target]) {
      await supabase.from(t).delete().eq("user_id", user.id);
    }
    toast.success("ডেটা মুছে ফেলা হয়েছে");
  };

  const isGoogle =
    user?.app_metadata?.providers?.includes("google") ||
    user?.app_metadata?.provider === "google";

  const initial = (displayName || user?.email || "U").charAt(0).toUpperCase();

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 md:p-8 shadow-soft">
          <div className="absolute inset-0 bg-glow opacity-70" />
          <div className="relative space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">কনফিগারেশন</p>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <SettingsIcon className="h-7 w-7 text-accent" /> সেটিংস
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              আপনার অ্যাকাউন্ট, নোটিফিকেশন এবং অ্যাপের চেহারা নিয়ন্ত্রণ করুন।
            </p>
          </div>
        </div>

        {/* Profile */}
        <SectionCard icon={User} title="প্রোফাইল" description="আপনার নাম, ইমেইল ও অবতার">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-border">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-gradient-accent text-accent-foreground font-semibold text-lg">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{displayName || "আপনার নাম"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">নাম</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="আপনার নাম"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avatar">অবতার URL</Label>
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>ইমেইল</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile} className="press">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {savingProfile ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </SectionCard>

        {/* Account */}
        <SectionCard icon={Lock} title="অ্যাকাউন্ট" description="পাসওয়ার্ড ও সংযুক্ত অ্যাকাউন্ট">
          <Row label="Google সংযোগ" hint={isGoogle ? "আপনার অ্যাকাউন্ট Google এর মাধ্যমে সংযুক্ত" : "Google অ্যাকাউন্ট সংযুক্ত নয়"}>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isGoogle ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
              {isGoogle ? "সংযুক্ত" : "সংযুক্ত নয়"}
            </span>
          </Row>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label htmlFor="pw">নতুন পাসওয়ার্ড</Label>
            <div className="flex gap-2">
              <Input
                id="pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষর"
              />
              <Button onClick={changePassword} disabled={savingPassword || !newPassword} className="press shrink-0">
                {savingPassword ? "…" : "পরিবর্তন"}
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={Bell} title="নোটিফিকেশন" description="রিমাইন্ডার ও অ্যালার্ট">
          <Row label="অভ্যাস রিমাইন্ডার" hint="দৈনিক অভ্যাসের জন্য মনে করিয়ে দেওয়া">
            <Switch checked={notif.habit} onCheckedChange={(v) => updateNotif("habit", v)} />
          </Row>
          <Row label="রুটিন রিমাইন্ডার" hint="রুটিন শুরুর সময় বিজ্ঞপ্তি">
            <Switch checked={notif.routine} onCheckedChange={(v) => updateNotif("routine", v)} />
          </Row>
          <Row label="নামায রিমাইন্ডার" hint="পাঁচ ওয়াক্তের সময়সূচি">
            <Switch checked={notif.namaz} onCheckedChange={(v) => updateNotif("namaz", v)} />
          </Row>
          <Row label="স্ট্রিক ওয়ার্নিং" hint="স্ট্রিক ভেঙে যাওয়ার আগে সতর্কবার্তা">
            <Switch checked={notif.streak} onCheckedChange={(v) => updateNotif("streak", v)} />
          </Row>
        </SectionCard>

        {/* Appearance */}
        <SectionCard icon={Palette} title="চেহারা" description="থিম, ফন্ট ও লেআউট">
          <Row label="থিম মোড" hint="হালকা বা গাঢ় চেহারা">
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-smooth ${
                  theme === "light" ? "bg-accent-soft text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="h-3.5 w-3.5" /> হালকা
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-smooth ${
                  theme === "dark" ? "bg-accent-soft text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Moon className="h-3.5 w-3.5" /> গাঢ়
              </button>
            </div>
          </Row>

          <Row label="ফন্ট সাইজ" hint="পাঠের আকার">
            <Select value={fontScale} onValueChange={(v) => setFontScale(v as "sm" | "md" | "lg")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">ছোট</SelectItem>
                <SelectItem value="md">মাঝারি</SelectItem>
                <SelectItem value="lg">বড়</SelectItem>
              </SelectContent>
            </Select>
          </Row>

          <Row label="লেআউট ঘনত্ব" hint="কম্প্যাক্ট হলে কম জায়গা ব্যবহৃত হয়">
            <Select value={density} onValueChange={(v) => setDensity(v as "comfortable" | "compact")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">আরামদায়ক</SelectItem>
                <SelectItem value="compact">কম্প্যাক্ট</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </SectionCard>

        {/* Language */}
        <SectionCard icon={Languages} title="ভাষা" description="UI ভাষা পছন্দ">
          <Row label="প্রাথমিক ভাষা" hint="বাংলা UI · technical terms ইংরেজিতে">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-accent-soft text-accent">
              বাংলা (default)
            </span>
          </Row>
        </SectionCard>

        {/* Data */}
        <SectionCard icon={Database} title="ডেটা" description="রপ্তানি ও মুছে ফেলা">
          <Row label="ডেটা এক্সপোর্ট" hint="JSON ফাইল হিসেবে ডাউনলোড করুন">
            <Button variant="outline" onClick={exportData} className="press">
              <Download className="h-4 w-4 mr-1.5" />
              এক্সপোর্ট
            </Button>
          </Row>

          <div className="pt-3 border-t border-border/50 space-y-3">
            <p className="text-xs font-medium text-destructive uppercase tracking-wider">বিপজ্জনক জোন</p>

            {([
              { key: "habits", label: "সব অভ্যাস ডেটা মুছুন", hint: "অভ্যাস ও চেক-ইন স্থায়ীভাবে মুছে যাবে" },
              { key: "routines", label: "সব রুটিন ডেটা মুছুন", hint: "রুটিন টেমপ্লেট ও সম্পূর্ণতা মুছে যাবে" },
              { key: "transactions", label: "সব লেনদেন মুছুন", hint: "অর্থ লেনদেন ইতিহাস মুছে যাবে" },
            ] as const).map((it) => (
              <Row key={it.key} label={it.label} hint={it.hint}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="press border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-1.5" /> মুছুন
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {it.hint}। এই ক্রিয়া পূর্বাবস্থায় ফেরানো যাবে না।
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>বাতিল</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => clearData(it.key)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        হ্যাঁ, মুছুন
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Row>
            ))}
          </div>
        </SectionCard>

        <p className="text-center text-xs text-muted-foreground py-4">
          সাইন আউট করতে ডানদিকের প্রোফাইল আইকনে ক্লিক করুন।
        </p>
      </div>
    </AppLayout>
  );
};

export default Settings;