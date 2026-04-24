import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";

const signInSchema = z.object({
  email: z.string().trim().email("সঠিক email দিন").max(255),
  password: z.string().min(6, "কমপক্ষে ৬ অক্ষর").max(72),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(1, "নাম দিন").max(80),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Sign up
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email: siEmail, password: siPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email বা password ভুল" : error.message);
      return;
    }
    toast.success("স্বাগতম! 🎉");
    navigate("/dashboard");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ email: suEmail, password: suPassword, displayName: suName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: parsed.data.displayName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already") ? "এই email আগে থেকে registered" : error.message);
      return;
    }
    toast.success("অ্যাকাউন্ট তৈরি হয়েছে! ✨");
    navigate("/dashboard");
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <Link to="/"><Logo /></Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 glass shadow-elevated animate-scale-in">
          <div className="mb-6 text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">শুরু করুন আজই</h1>
            <p className="text-sm text-muted-foreground">আপনার জীবন গুছিয়ে রাখুন এক জায়গায়</p>
          </div>

          <Button
            onClick={handleGoogle}
            disabled={loading}
            variant="outline"
            className="press w-full mb-5 border-border/80 hover:bg-muted"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google দিয়ে চালিয়ে যান
          </Button>

          <div className="relative mb-5 flex items-center">
            <div className="flex-1 border-t border-border/60" />
            <span className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground">অথবা</span>
            <div className="flex-1 border-t border-border/60" />
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger value="signin">লগইন</TabsTrigger>
              <TabsTrigger value="signup">নতুন অ্যাকাউন্ট</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="si-email" className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="si-email" type="email" placeholder="you@example.com" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} className="pl-9" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-pass" className="text-xs">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="si-pass" type="password" placeholder="••••••••" value={siPassword} onChange={(e) => setSiPassword(e.target.value)} className="pl-9" autoComplete="current-password" />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="press w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "লগইন করুন"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name" className="text-xs">আপনার নাম</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="su-name" placeholder="রহিম উদ্দিন" value={suName} onChange={(e) => setSuName(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email" className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="su-email" type="email" placeholder="you@example.com" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} className="pl-9" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pass" className="text-xs">Password (৬+ অক্ষর)</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="su-pass" type="password" placeholder="••••••••" value={suPassword} onChange={(e) => setSuPassword(e.target.value)} className="pl-9" autoComplete="new-password" />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="press w-full bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "অ্যাকাউন্ট তৈরি করুন"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            চালিয়ে যাওয়ার মাধ্যমে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Auth;