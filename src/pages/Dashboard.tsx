import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Wallet, ListChecks, Sparkles, TrendingUp, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RoutineAnalyticsPreview } from "@/components/routines/RoutineAnalyticsPreview";

const Dashboard = () => {
  const { user } = useAuth();
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "বন্ধু";

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Hero greeting */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-soft">
          <div className="absolute inset-0 bg-glow opacity-70" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">শুভ দিন</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                স্বাগতম, <span className="text-accent">{name}</span> 🌿
              </h1>
              <p className="text-sm text-muted-foreground max-w-md">
                আজকের অগ্রগতি এক নজরে দেখে নিন। প্রতিটি ছোট পদক্ষেপই বড় পরিবর্তন আনে।
              </p>
            </div>
            <Button size="lg" className="press shadow-glow bg-gradient-accent text-accent-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              নতুন যোগ করুন
            </Button>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="অভ্যাস স্ট্রিক" value="১২ দিন" hint="🔥 চমৎকার ধারাবাহিকতা" icon={Flame} accent="warning" trend={{ value: "+১৮%", positive: true }} />
          <StatCard label="রুটিন সম্পন্ন" value="৬৮%" hint="আজকের অগ্রগতি" icon={ListChecks} accent="accent" trend={{ value: "+৫%", positive: true }} />
          <StatCard label="মোট ব্যালেন্স" value="৳ ৪২,৫০০" hint="চলতি মাস" icon={Wallet} accent="primary" trend={{ value: "+১২%", positive: true }} />
          <StatCard label="পয়েন্ট অর্জন" value="১,২৪০" hint="Level 4 — Achiever" icon={Sparkles} accent="success" trend={{ value: "+৭%", positive: true }} />
        </div>

        {/* Two column area */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6 shadow-soft">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">সাপ্তাহিক বিশ্লেষণ</h3>
                <p className="text-xs text-muted-foreground">আপনার গত ৭ দিনের কার্যক্রম</p>
              </div>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            {/* Placeholder chart bars */}
            <div className="flex h-48 items-end justify-between gap-3">
              {["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র"].map((day, i) => {
                const heights = [60, 45, 80, 55, 90, 70, 85];
                return (
                  <div key={day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-accent/40 to-accent transition-spring hover:from-accent/60"
                        style={{ height: `${heights[i]}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{day}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 shadow-soft glass">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent">
                <Sparkles className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI অন্তর্দৃষ্টি</h3>
                <p className="text-[10px] text-muted-foreground">আজকের জন্য</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-foreground/90">
                আপনি গত সপ্তাহে সকালের অভ্যাসগুলোতে <span className="font-semibold text-accent">২২% বেশি</span> ধারাবাহিক ছিলেন। চমৎকার!
              </p>
              <div className="rounded-lg border border-border/50 bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">💡 পরামর্শ</p>
                <p className="mt-1 text-xs">দুপুরের রুটিনে একটি ছোট বিরতি যোগ করুন।</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Routine analytics preview */}
        <RoutineAnalyticsPreview />

        {/* Coming soon notice */}
        <Card className="border-dashed border-2 border-border/60 bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            🚧 Habit Tracker, Routine Manager এবং Finance modules শীঘ্রই যোগ হবে
          </p>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;