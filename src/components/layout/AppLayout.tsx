import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { NotificationCenter } from "@/components/NotificationCenter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 glass backdrop-blur-xl px-3 shadow-soft md:px-6">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              {/* Desktop/tablet: sidebar trigger on the left */}
              <SidebarTrigger className="press shrink-0 hidden md:inline-flex" />
              <div className="flex items-center shrink-0">
                <Logo />
              </div>
              <div className="hidden lg:block pl-2">
                <h2 className="text-sm font-medium text-muted-foreground">স্বাগতম 👋</h2>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationCenter />
              <ThemeToggle />
              <div className="mx-1 h-6 w-px bg-border hidden sm:block" />

              {/* Profile dropdown — contains Sign out */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="press rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Profile menu"
                  >
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="bg-gradient-accent text-accent-foreground text-xs font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">
                    {user?.user_metadata?.display_name || user?.email || "অ্যাকাউন্ট"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    সাইন আউট
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile: menu trigger on the right (replaces logout slot) */}
              <SidebarTrigger className="press shrink-0 md:hidden" />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};