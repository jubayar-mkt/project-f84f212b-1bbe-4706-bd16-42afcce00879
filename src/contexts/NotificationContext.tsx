import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

interface NotificationContextValue {
  items: AppNotification[];
  unread: number;
  loading: boolean;
  permission: NotificationPermission | "unsupported";
  requestPermission: () => Promise<NotificationPermission | "unsupported">;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  pushLocal: (n: { title: string; body?: string; type?: string; link?: string }) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const NOTIF_PREFS_KEY = "notif_prefs_v1";
const SEEN_REMINDERS_KEY = "notif_seen_reminders_v1";

type NotifPrefs = { habit: boolean; routine: boolean; namaz: boolean; streak: boolean };
const defaultPrefs: NotifPrefs = { habit: true, routine: true, namaz: true, streak: true };

function getPrefs(): NotifPrefs {
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || "{}") };
  } catch {
    return defaultPrefs;
  }
}

function showBrowserNotification(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: title,
    });
    setTimeout(() => n.close(), 6000);
  } catch {
    // noop
  }
}

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const lastIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as AppNotification[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as AppNotification;
          setItems((prev) => {
            if (prev.some((p) => p.id === n.id)) return prev;
            return [n, ...prev].slice(0, 50);
          });
          if (lastIdRef.current !== n.id) {
            lastIdRef.current = n.id;
            showBrowserNotification(n.title, n.body || undefined);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as AppNotification;
          setItems((prev) => prev.map((p) => (p.id === n.id ? n : p)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const old = payload.old as { id: string };
          setItems((prev) => prev.filter((p) => p.id !== old.id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported" as const;
    const res = await Notification.requestPermission();
    setPermission(res);
    return res;
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
    await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setItems((prev) => prev.map((p) => ({ ...p, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }, [user]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    setItems((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("notifications").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    setItems([]);
    await supabase.from("notifications").delete().eq("user_id", user.id);
  }, [user]);

  const pushLocal = useCallback(
    async (n: { title: string; body?: string; type?: string; link?: string }) => {
      if (!user) return;
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: n.title,
        body: n.body ?? null,
        type: n.type ?? "system",
        link: n.link ?? null,
      });
    },
    [user]
  );

  // ----- Smart reminders driven by user prefs -----
  // Once per day per kind, respect Settings toggles. Stored in localStorage to avoid spam.
  useEffect(() => {
    if (!user) return;
    const prefs = getPrefs();
    const today = new Date().toISOString().slice(0, 10);
    let seen: Record<string, string> = {};
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_REMINDERS_KEY) || "{}");
    } catch {
      seen = {};
    }

    const tasks: Array<{ key: string; cond: boolean; title: string; body: string; type: string; link: string }> = [];
    const hour = new Date().getHours();

    if (prefs.habit && hour >= 8) {
      tasks.push({
        key: `habit-${today}`,
        cond: true,
        title: "আজকের অভ্যাস চেক করুন",
        body: "আপনার দৈনিক অভ্যাসগুলো সম্পন্ন করতে ভুলবেন না।",
        type: "habit",
        link: "/habits",
      });
    }
    if (prefs.routine && hour >= 7) {
      tasks.push({
        key: `routine-${today}`,
        cond: true,
        title: "আজকের রুটিন প্রস্তুত",
        body: "আজকের রুটিন দেখে নিন এবং শুরু করুন।",
        type: "routine",
        link: "/routines",
      });
    }

    (async () => {
      for (const t of tasks) {
        if (seen[t.key] === today) continue;
        await pushLocal({ title: t.title, body: t.body, type: t.type, link: t.link });
        seen[t.key] = today;
      }
      localStorage.setItem(SEEN_REMINDERS_KEY, JSON.stringify(seen));
    })();
  }, [user, pushLocal]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <NotificationContext.Provider
      value={{
        items,
        unread,
        loading,
        permission,
        requestPermission,
        markAsRead,
        markAllAsRead,
        remove,
        clearAll,
        pushLocal,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
};