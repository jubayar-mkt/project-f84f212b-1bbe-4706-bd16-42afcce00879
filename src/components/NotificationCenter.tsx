import { useNavigate } from "react-router-dom";
import { Bell, BellOff, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/contexts/NotificationContext";
import { toast } from "sonner";

const typeColor: Record<string, string> = {
  habit: "bg-accent/15 text-accent",
  routine: "bg-primary/15 text-primary",
  namaz: "bg-success/15 text-success",
  streak: "bg-warning/15 text-warning",
  system: "bg-muted text-muted-foreground",
};

const typeLabel: Record<string, string> = {
  habit: "অভ্যাস",
  routine: "রুটিন",
  namaz: "নামায",
  streak: "স্ট্রিক",
  system: "সিস্টেম",
};

function timeAgoBn(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "এইমাত্র";
  if (m < 60) return `${m} মি. আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘ. আগে`;
  const d = Math.floor(h / 24);
  return `${d} দিন আগে`;
}

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const {
    items,
    unread,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    remove,
    clearAll,
  } = useNotifications();

  const handleEnablePush = async () => {
    const res = await requestPermission();
    if (res === "granted") toast.success("পুশ নোটিফিকেশন চালু হয়েছে");
    else if (res === "denied") toast.error("ব্রাউজার সেটিংস থেকে অনুমতি দিন");
    else if (res === "unsupported") toast.error("আপনার ব্রাউজার সাপোর্ট করে না");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="press relative" aria-label="নোটিফিকেশন">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground shadow-soft animate-pulse-glow">
              {unread > 9 ? "৯+" : new Intl.NumberFormat("bn-BD").format(unread)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[380px] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">নোটিফিকেশন</h3>
            <p className="text-xs text-muted-foreground">
              {unread > 0
                ? `${new Intl.NumberFormat("bn-BD").format(unread)} টি অপঠিত`
                : "সব পঠিত"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => markAllAsRead()}
                title="সব পঠিত করুন"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> সব পঠিত
              </Button>
            )}
          </div>
        </div>

        {permission !== "granted" && permission !== "unsupported" && (
          <div className="flex items-center gap-2 border-b border-border/60 bg-accent-soft/40 px-4 py-2.5">
            <BellOff className="h-4 w-4 text-accent shrink-0" />
            <p className="text-xs text-foreground flex-1">
              ব্রাউজার পুশ চালু করুন রিয়েল-টাইম রিমাইন্ডারের জন্য
            </p>
            <Button size="sm" className="h-7 text-xs press" onClick={handleEnablePush}>
              চালু করুন
            </Button>
          </div>
        )}

        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">কোনো নোটিফিকেশন নেই</p>
              <p className="text-xs text-muted-foreground mt-1">
                নতুন আপডেট এলে এখানে দেখাবে
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`group relative flex gap-3 px-4 py-3 transition-smooth hover:bg-muted/40 ${
                    !n.read ? "bg-accent-soft/20" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={async () => {
                      if (!n.read) await markAsRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          typeColor[n.type] ?? typeColor.system
                        }`}
                      >
                        {typeLabel[n.type] ?? typeLabel.system}
                      </span>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-accent" aria-label="অপঠিত" />
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {timeAgoBn(n.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                    )}
                  </button>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="পঠিত করুন"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => remove(n.id)}
                      className="rounded-md p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="মুছুন"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <div className="border-t border-border/60 px-3 py-2 flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => clearAll()}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> সব মুছুন
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};