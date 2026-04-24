import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const initial = (user?.user_metadata?.display_name || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 glass px-4 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="press" />
              <div className="hidden sm:block">
                <h2 className="text-sm font-medium text-muted-foreground">স্বাগতম 👋</h2>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="press relative">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent animate-pulse-glow" />
              </Button>
              <ThemeToggle />
              <div className="mx-2 h-6 w-px bg-border" />
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-gradient-accent text-accent-foreground text-xs font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="press" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};