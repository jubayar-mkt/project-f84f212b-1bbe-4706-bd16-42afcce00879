import { LayoutDashboard, ListTodo, Sparkles, Wallet, Trophy, Settings, BarChart3, Activity } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";

const mainItems = [
  { title: "ড্যাশবোর্ড", url: "/dashboard", icon: LayoutDashboard },
  { title: "রুটিন", url: "/routines", icon: ListTodo },
  { title: "রুটিন বিশ্লেষণ", url: "/routine-analytics", icon: Activity },
  { title: "অভ্যাস", url: "/habits", icon: Sparkles },
  { title: "অভ্যাস বিশ্লেষণ", url: "/analytics", icon: BarChart3 },
  { title: "অর্থ", url: "/finance", icon: Wallet },
];

const secondaryItems = [
  { title: "অর্জন", url: "/achievements", icon: Trophy },
  { title: "সেটিংস", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => {
      const active = location.pathname === item.url;
      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth ${
                active
                  ? "bg-accent-soft text-accent font-medium shadow-soft"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent animate-slide-in-right" />
              )}
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-5">
        <Logo collapsed={collapsed} />
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-wider">প্রধান</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          {!collapsed && <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-wider">অন্যান্য</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{renderItems(secondaryItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}