import { Sparkles } from "lucide-react";

export const Logo = ({ collapsed = false }: { collapsed?: boolean }) => (
  <div className="flex items-center gap-2.5">
    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent shadow-glow">
      <Sparkles className="h-4 w-4 text-accent-foreground" />
    </div>
    {!collapsed && (
      <div className="flex flex-col leading-none">
        <span className="font-en text-lg font-bold tracking-tight text-foreground">JibonOS</span>
        <span className="text-[10px] text-muted-foreground">জীবন গুছিয়ে রাখুন</span>
      </div>
    )}
  </div>
);