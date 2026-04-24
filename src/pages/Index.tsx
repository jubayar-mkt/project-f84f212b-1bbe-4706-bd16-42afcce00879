import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowRight, Sparkles, ListTodo, Wallet, TrendingUp, Brain, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: ListTodo, title: "রুটিন ব্যবস্থাপনা", desc: "দিনের পরিকল্পনা সাজান, সময়সূচী visualize করুন এবং কাজ সম্পন্ন করুন।" },
  { icon: Sparkles, title: "অভ্যাস ট্র্যাকিং", desc: "Streak, calendar history এবং smart reminder — অভ্যাস তৈরির পূর্ণ system।" },
  { icon: Wallet, title: "অর্থ ব্যবস্থাপনা", desc: "Income, expense, budget এবং savings goal — সব এক জায়গায়।" },
  { icon: TrendingUp, title: "Advanced Analytics", desc: "Trends, comparisons এবং growth insights চমৎকার chart-এ।" },
  { icon: Brain, title: "AI Insights", desc: "ব্যক্তিগত পরামর্শ এবং behavior analysis — Lovable AI-এর সহায়তায়।" },
  { icon: Shield, title: "নিরাপদ ও দ্রুত", desc: "Realtime sync, end-to-end secure data এবং premium UX।" },
];

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between p-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button variant="ghost" className="press">
              {user ? "ড্যাশবোর্ড" : "লগইন"}
            </Button>
          </Link>
          {!user && (
            <Link to="/auth">
              <Button className="press bg-gradient-primary text-primary-foreground hover:opacity-90">
                শুরু করুন
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Hero */}
        <section className="py-20 md:py-32 text-center animate-fade-in">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 glass px-4 py-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
            <span className="text-muted-foreground">Premium SaaS · বাংলায়</span>
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            অভ্যাস, রুটিন এবং অর্থ —{" "}
            <span className="bg-gradient-to-r from-accent to-primary-glow bg-clip-text text-transparent">
              এক জায়গায় গুছিয়ে রাখুন
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
            JibonOS আপনার দৈনন্দিন জীবনকে structured করে — AI insights, advanced analytics এবং gamification-এর সমন্বয়ে।
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={user ? "/dashboard" : "/auth"}>
              <Button size="lg" className="press bg-gradient-accent text-accent-foreground shadow-glow hover:opacity-90">
                {user ? "ড্যাশবোর্ডে যান" : "বিনামূল্যে শুরু করুন"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="press border-border/80">
                আরও জানুন
              </Button>
            </a>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-16">
          <div className="mb-12 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-accent">বৈশিষ্ট্যসমূহ</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              সবকিছু এক জায়গায়
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="group p-6 hover-lift border-border/60">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent transition-spring group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <Card className="relative overflow-hidden border-border/60 p-10 md:p-14 text-center shadow-elevated">
            <div className="absolute inset-0 bg-gradient-primary opacity-95" />
            <div className="absolute inset-0 bg-glow opacity-50" />
            <div className="relative space-y-4">
              <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground">
                আজই আপনার যাত্রা শুরু করুন
              </h2>
              <p className="mx-auto max-w-xl text-sm md:text-base text-primary-foreground/80">
                বিনামূল্যে শুরু করুন। কোনো credit card প্রয়োজন নেই।
              </p>
              <div className="pt-4">
                <Link to={user ? "/dashboard" : "/auth"}>
                  <Button size="lg" className="press bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                    {user ? "ড্যাশবোর্ডে যান" : "অ্যাকাউন্ট তৈরি করুন"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} JibonOS — বাংলায় তৈরি premium productivity platform
        </footer>
      </main>
    </div>
  );
};

export default Index;
