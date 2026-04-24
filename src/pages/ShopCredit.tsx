import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Wallet, BadgeDollarSign, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2,
  Store, Search, Calendar, AlertCircle, CheckCircle2, TrendingUp, ReceiptText,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CreditDialog, CreditFormData } from "@/components/shop-credit/CreditDialog";
import { PaymentDialog, PaymentFormData } from "@/components/shop-credit/PaymentDialog";
import { BanglaDateRangePicker, DateRange } from "@/components/ui/bangla-date-range-picker";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatBnDate, toBn, toLocalDateStr } from "@/lib/bangla";
import { cn } from "@/lib/utils";

interface Credit {
  id: string;
  shop_name: string;
  purchase_date: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  note: string | null;
}

interface Payment {
  id: string;
  shop_name: string;
  payment_date: string;
  paid_amount: number;
  payment_method: string | null;
  note: string | null;
}

const fmtBdt = (n: number) => `৳ ${toBn(n.toLocaleString("en-IN", { maximumFractionDigits: 2 }))}`;

type StatusFilter = "all" | "paid" | "unpaid";

const ShopCredit = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [creditDialog, setCreditDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [editingCredit, setEditingCredit] = useState<CreditFormData | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentFormData | null>(null);
  const [defaultPayShop, setDefaultPayShop] = useState<string | undefined>();
  const [deleteCredit, setDeleteCredit] = useState<Credit | null>(null);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);

  // Filters
  const today = new Date();
  const monthAgo = new Date(); monthAgo.setDate(today.getDate() - 29);
  const [range, setRange] = useState<DateRange>({ start: monthAgo, end: today });
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [cr, pr] = await Promise.all([
      supabase.from("shop_credits").select("*").eq("user_id", user.id).order("purchase_date", { ascending: false }),
      supabase.from("shop_payments").select("*").eq("user_id", user.id).order("payment_date", { ascending: false }),
    ]);
    setLoading(false);
    if (cr.error) toast.error(cr.error.message);
    if (pr.error) toast.error(pr.error.message);
    setCredits((cr.data ?? []) as Credit[]);
    setPayments((pr.data ?? []) as Payment[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("shop-credit-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_credits", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_payments", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  const allShops = useMemo(() => {
    const s = new Set<string>();
    credits.forEach((c) => s.add(c.shop_name));
    payments.forEach((p) => s.add(p.shop_name));
    return Array.from(s).sort();
  }, [credits, payments]);

  // Per-shop totals (across ALL records — for accurate due calculation)
  const shopTotals = useMemo(() => {
    const map = new Map<string, { credit: number; paid: number }>();
    for (const c of credits) {
      const cur = map.get(c.shop_name) ?? { credit: 0, paid: 0 };
      cur.credit += Number(c.total_amount);
      map.set(c.shop_name, cur);
    }
    for (const p of payments) {
      const cur = map.get(p.shop_name) ?? { credit: 0, paid: 0 };
      cur.paid += Number(p.paid_amount);
      map.set(p.shop_name, cur);
    }
    return Array.from(map.entries()).map(([shop, v]) => ({
      shop,
      credit: v.credit,
      paid: v.paid,
      due: Math.max(0, v.credit - v.paid),
      fullyPaid: v.paid >= v.credit && v.credit > 0,
    })).sort((a, b) => b.due - a.due);
  }, [credits, payments]);

  // Apply filters
  const startStr = toLocalDateStr(range.start);
  const endStr = toLocalDateStr(range.end);
  const inRange = (d: string) => d >= startStr && d <= endStr;
  const matchesShop = (s: string) => shopFilter === "all" || s === shopFilter;
  const matchesSearch = (text: string) => !search || text.toLowerCase().includes(search.toLowerCase());

  const filteredCredits = useMemo(() => credits.filter((c) =>
    inRange(c.purchase_date) && matchesShop(c.shop_name) &&
    (matchesSearch(c.item_name) || matchesSearch(c.shop_name))
  ).filter((c) => {
    if (statusFilter === "all") return true;
    const t = shopTotals.find((s) => s.shop === c.shop_name);
    if (!t) return statusFilter === "unpaid";
    return statusFilter === "paid" ? t.fullyPaid : !t.fullyPaid;
  }), [credits, range, shopFilter, search, statusFilter, shopTotals]);

  const filteredPayments = useMemo(() => payments.filter((p) =>
    inRange(p.payment_date) && matchesShop(p.shop_name) &&
    (matchesSearch(p.note ?? "") || matchesSearch(p.shop_name) || matchesSearch(p.payment_method ?? ""))
  ), [payments, range, shopFilter, search]);

  // Summary
  const summary = useMemo(() => {
    const totalCredit = credits.reduce((s, c) => s + Number(c.total_amount), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
    const due = Math.max(0, totalCredit - totalPaid);
    const lastPurchase = credits[0]?.purchase_date ?? null;
    const lastPayment = payments[0]?.payment_date ?? null;
    return { totalCredit, totalPaid, due, lastPurchase, lastPayment };
  }, [credits, payments]);

  // Trend data — credits & payments by date (within range)
  const trendData = useMemo(() => {
    const map = new Map<string, { credit: number; payment: number }>();
    const cur = new Date(range.start);
    while (cur <= range.end) {
      map.set(toLocalDateStr(cur), { credit: 0, payment: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    for (const c of filteredCredits) {
      const m = map.get(c.purchase_date); if (m) m.credit += Number(c.total_amount);
    }
    for (const p of filteredPayments) {
      const m = map.get(p.payment_date); if (m) m.payment += Number(p.paid_amount);
    }
    return Array.from(map.entries()).map(([d, v]) => {
      const dt = new Date(d);
      return { date: d, label: `${toBn(dt.getDate())}/${toBn(dt.getMonth() + 1)}`, credit: v.credit, payment: v.payment };
    });
  }, [filteredCredits, filteredPayments, range]);

  // Monthly comparison (last 6 months — independent of date range filter)
  const monthlyData = useMemo(() => {
    const months: { key: string; label: string; credit: number; payment: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: `${toBn(d.getMonth() + 1)}/${toBn(String(d.getFullYear()).slice(-2))}`, credit: 0, payment: 0 });
    }
    const idx = (ds: string) => ds.slice(0, 7);
    for (const c of credits) { const m = months.find((x) => x.key === idx(c.purchase_date)); if (m) m.credit += Number(c.total_amount); }
    for (const p of payments) { const m = months.find((x) => x.key === idx(p.payment_date)); if (m) m.payment += Number(p.paid_amount); }
    return months;
  }, [credits, payments]);

  const highestDueShop = shopTotals[0];
  const fullyPaidCount = shopTotals.filter((s) => s.fullyPaid).length;
  const unpaidCount = shopTotals.filter((s) => !s.fullyPaid && s.credit > 0).length;

  // Group filtered credits by date
  const creditsByDate = useMemo(() => {
    const map = new Map<string, Credit[]>();
    for (const c of filteredCredits) {
      const arr = map.get(c.purchase_date) ?? [];
      arr.push(c);
      map.set(c.purchase_date, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredCredits]);

  const paymentsByDate = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of filteredPayments) {
      const arr = map.get(p.payment_date) ?? [];
      arr.push(p);
      map.set(p.payment_date, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredPayments]);

  const handleDeleteCredit = async () => {
    if (!deleteCredit) return;
    const { error } = await supabase.from("shop_credits").delete().eq("id", deleteCredit.id);
    if (error) toast.error(error.message); else toast.success("মুছে ফেলা হয়েছে");
    setDeleteCredit(null); load();
  };
  const handleDeletePayment = async () => {
    if (!deletePayment) return;
    const { error } = await supabase.from("shop_payments").delete().eq("id", deletePayment.id);
    if (error) toast.error(error.message); else toast.success("পেমেন্ট মুছে ফেলা হয়েছে");
    setDeletePayment(null); load();
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">বকেয়া হিসেব</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              দোকানে বাকি কেনাকাটা ও পরিশোধের আলাদা হিসাব
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => { setEditingPayment(null); setDefaultPayShop(undefined); setPaymentDialog(true); }}
              variant="outline"
              className="press border-success/40 text-success hover:bg-success/10"
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" /> পেমেন্ট
            </Button>
            <Button
              onClick={() => { setEditingCredit(null); setCreditDialog(true); }}
              className="press bg-gradient-to-r from-destructive to-warning text-destructive-foreground shadow-glow hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" /> বকেয়া যোগ
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="মোট বকেয়া নেওয়া"
                value={fmtBdt(summary.totalCredit)}
                hint={summary.lastPurchase ? `সর্বশেষ: ${formatBnDate(new Date(summary.lastPurchase))}` : "—"}
                icon={ArrowDownCircle}
                accent="warning"
              />
              <StatCard
                label="মোট পরিশোধ"
                value={fmtBdt(summary.totalPaid)}
                hint={summary.lastPayment ? `সর্বশেষ: ${formatBnDate(new Date(summary.lastPayment))}` : "—"}
                icon={ArrowUpCircle}
                accent="success"
              />
              <StatCard
                label="অবশিষ্ট বকেয়া"
                value={fmtBdt(summary.due)}
                hint={summary.due > 0 ? "পরিশোধ বাকি" : "সম্পূর্ণ পরিশোধিত"}
                icon={Wallet}
                accent={summary.due > 0 ? "destructive" : "success"}
              />
              <StatCard
                label="দোকান সংখ্যা"
                value={toBn(shopTotals.length)}
                hint={`পরিশোধিত ${toBn(fullyPaidCount)} • বাকি ${toBn(unpaidCount)}`}
                icon={Store}
                accent="primary"
              />
            </div>

            {/* Filters */}
            <Card className="p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="দোকান বা পণ্য খুঁজুন..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={shopFilter} onValueChange={setShopFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="সব দোকান" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব দোকান</SelectItem>
                    {allShops.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <ToggleGroup
                  type="single"
                  value={statusFilter}
                  onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}
                  className="rounded-lg border border-border/60 bg-card p-1 shadow-soft"
                >
                  <ToggleGroupItem value="all" className="px-3 py-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">সব</ToggleGroupItem>
                  <ToggleGroupItem value="unpaid" className="px-3 py-1 text-xs data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive">বাকি</ToggleGroupItem>
                  <ToggleGroupItem value="paid" className="px-3 py-1 text-xs data-[state=on]:bg-success/15 data-[state=on]:text-success">পরিশোধিত</ToggleGroupItem>
                </ToggleGroup>
                <BanglaDateRangePicker value={range} onChange={setRange} />
              </div>
            </Card>

            {/* Tabs: Records vs Analytics */}
            <Tabs defaultValue="records" className="space-y-4">
              <TabsList className="bg-card border border-border/60">
                <TabsTrigger value="records"><ReceiptText className="mr-2 h-3.5 w-3.5" /> রেকর্ড</TabsTrigger>
                <TabsTrigger value="shops"><Store className="mr-2 h-3.5 w-3.5" /> দোকান অনুযায়ী</TabsTrigger>
                <TabsTrigger value="analytics"><TrendingUp className="mr-2 h-3.5 w-3.5" /> অ্যানালিটিক্স</TabsTrigger>
              </TabsList>

              <TabsContent value="records" className="space-y-6">
                {/* Credits timeline */}
                <Card className="p-5 shadow-soft">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-warning" /> বকেয়া এন্ট্রি
                      </h3>
                      <p className="text-xs text-muted-foreground">{toBn(filteredCredits.length)} টি রেকর্ড</p>
                    </div>
                  </div>
                  {creditsByDate.length === 0 ? (
                    <EmptyState icon={ReceiptText} text="এই ফিল্টারে কোনো এন্ট্রি নেই" />
                  ) : (
                    <div className="space-y-5">
                      {creditsByDate.map(([date, items]) => {
                        const dayTotal = items.reduce((s, x) => s + Number(x.total_amount), 0);
                        return (
                          <div key={date} className="space-y-2">
                            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-semibold">{formatBnDate(new Date(date))}</span>
                              </div>
                              <span className="text-xs font-semibold text-warning">{fmtBdt(dayTotal)}</span>
                            </div>
                            <div className="space-y-2">
                              {items.map((c) => (
                                <CreditRow
                                  key={c.id}
                                  c={c}
                                  fullyPaidShop={shopTotals.find((s) => s.shop === c.shop_name)?.fullyPaid ?? false}
                                  onEdit={() => { setEditingCredit({ ...c }); setCreditDialog(true); }}
                                  onDelete={() => setDeleteCredit(c)}
                                  onPay={() => { setEditingPayment(null); setDefaultPayShop(c.shop_name); setPaymentDialog(true); }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Payments timeline */}
                <Card className="p-5 shadow-soft">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-success" /> পেমেন্ট ইতিহাস
                      </h3>
                      <p className="text-xs text-muted-foreground">{toBn(filteredPayments.length)} টি পেমেন্ট</p>
                    </div>
                  </div>
                  {paymentsByDate.length === 0 ? (
                    <EmptyState icon={BadgeDollarSign} text="এই ফিল্টারে কোনো পেমেন্ট নেই" />
                  ) : (
                    <div className="space-y-5">
                      {paymentsByDate.map(([date, items]) => {
                        const dayTotal = items.reduce((s, x) => s + Number(x.paid_amount), 0);
                        return (
                          <div key={date} className="space-y-2">
                            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-semibold">{formatBnDate(new Date(date))}</span>
                              </div>
                              <span className="text-xs font-semibold text-success">{fmtBdt(dayTotal)}</span>
                            </div>
                            <div className="space-y-2">
                              {items.map((p) => (
                                <PaymentRow
                                  key={p.id}
                                  p={p}
                                  onEdit={() => { setEditingPayment({ ...p }); setPaymentDialog(true); }}
                                  onDelete={() => setDeletePayment(p)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* Shop-wise breakdown */}
              <TabsContent value="shops">
                <Card className="p-5 shadow-soft">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold">দোকান অনুযায়ী বকেয়া</h3>
                    <p className="text-xs text-muted-foreground">প্রতিটি দোকানের সামগ্রিক হিসাব (সব সময়ের)</p>
                  </div>
                  {shopTotals.length === 0 ? (
                    <EmptyState icon={Store} text="এখনও কোনো দোকান যোগ করা হয়নি" />
                  ) : (
                    <div className="space-y-3">
                      {shopTotals.map((s) => (
                        <div key={s.shop} className={cn(
                          "rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 shadow-soft transition-smooth hover:shadow-elevated",
                          s.fullyPaid && "border-success/30",
                          s.due > 0 && "border-destructive/20",
                        )}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                                s.fullyPaid ? "bg-gradient-to-br from-success/20 to-success/5 text-success" : "bg-gradient-to-br from-destructive/20 to-warning/10 text-destructive",
                              )}>
                                <Store className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold truncate">{s.shop}</h4>
                                <p className="text-[11px] text-muted-foreground">
                                  বকেয়া <span className="font-en">{fmtBdt(s.credit)}</span> • পরিশোধ <span className="font-en">{fmtBdt(s.paid)}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground">অবশিষ্ট</p>
                                <p className={cn("text-base font-bold font-en", s.due > 0 ? "text-destructive" : "text-success")}>
                                  {fmtBdt(s.due)}
                                </p>
                              </div>
                              {s.fullyPaid ? (
                                <Badge className="bg-success/15 text-success border-success/30">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> পরিশোধিত
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  className="press bg-gradient-to-r from-success to-accent text-accent-foreground"
                                  onClick={() => { setEditingPayment(null); setDefaultPayShop(s.shop); setPaymentDialog(true); }}
                                >
                                  পরিশোধ করুন
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Progress */}
                          <div className="mt-3 space-y-1">
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn("h-full transition-spring", s.fullyPaid ? "bg-gradient-to-r from-success to-accent" : "bg-gradient-to-r from-warning to-destructive")}
                                style={{ width: `${s.credit > 0 ? Math.min(100, (s.paid / s.credit) * 100) : 0}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>{toBn(s.credit > 0 ? Math.min(100, Math.round((s.paid / s.credit) * 100)) : 0)}% পরিশোধিত</span>
                              {highestDueShop && highestDueShop.shop === s.shop && s.due > 0 && (
                                <span className="text-destructive font-semibold flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> সর্বোচ্চ বকেয়া
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* Analytics */}
              <TabsContent value="analytics" className="space-y-6">
                {/* Trend */}
                <Card className="p-6 shadow-soft">
                  <div className="mb-5">
                    <h3 className="text-base font-semibold">ক্রেডিট vs পেমেন্ট ট্রেন্ড</h3>
                    <p className="text-xs text-muted-foreground">নির্বাচিত সময়কালে দৈনিক হিসাব</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={Math.max(0, Math.floor(trendData.length / 10))} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <RTooltip
                          contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: number, n: string) => [fmtBdt(v), n === "credit" ? "বকেয়া" : "পেমেন্ট"]}
                        />
                        <Line type="monotone" dataKey="credit" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="payment" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Monthly comparison */}
                  <Card className="lg:col-span-2 p-6 shadow-soft">
                    <div className="mb-5">
                      <h3 className="text-base font-semibold">মাসিক তুলনা (গত ৬ মাস)</h3>
                      <p className="text-xs text-muted-foreground">বকেয়া বনাম পরিশোধ</p>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <RTooltip
                            contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                            formatter={(v: number, n: string) => [fmtBdt(v), n === "credit" ? "বকেয়া" : "পেমেন্ট"]}
                          />
                          <Bar dataKey="credit" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="payment" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Paid vs Unpaid donut */}
                  <Card className="p-6 shadow-soft">
                    <div className="mb-5">
                      <h3 className="text-base font-semibold">পরিশোধিত vs বাকি</h3>
                      <p className="text-xs text-muted-foreground">দোকানের সংখ্যা</p>
                    </div>
                    <div className="relative h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "পরিশোধিত", value: fullyPaidCount },
                              { name: "বাকি", value: unpaidCount },
                            ]}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value"
                          >
                            <Cell fill="hsl(var(--success))" />
                            <Cell fill="hsl(var(--destructive))" />
                          </Pie>
                          <RTooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [toBn(v), ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-bold font-en">{toBn(shopTotals.length)}</p>
                        <p className="text-[10px] text-muted-foreground">দোকান</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> পরিশোধিত {toBn(fullyPaidCount)}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> বাকি {toBn(unpaidCount)}</span>
                    </div>
                  </Card>
                </div>

                {/* Shop-wise due breakdown */}
                <Card className="p-6 shadow-soft">
                  <div className="mb-5">
                    <h3 className="text-base font-semibold">দোকান অনুযায়ী অবশিষ্ট বকেয়া</h3>
                    <p className="text-xs text-muted-foreground">শীর্ষ বকেয়া দোকানগুলো</p>
                  </div>
                  {shopTotals.filter((s) => s.due > 0).length === 0 ? (
                    <EmptyState icon={CheckCircle2} text="কোনো অবশিষ্ট বকেয়া নেই 🎉" />
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={shopTotals.filter((s) => s.due > 0).slice(0, 10)} layout="vertical">
                          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis dataKey="shop" type="category" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <RTooltip
                            contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                            formatter={(v: number) => [fmtBdt(v), "অবশিষ্ট"]}
                          />
                          <Bar dataKey="due" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <CreditDialog
        open={creditDialog}
        onOpenChange={setCreditDialog}
        initial={editingCredit}
        shopSuggestions={allShops}
        onSaved={load}
      />
      <PaymentDialog
        open={paymentDialog}
        onOpenChange={setPaymentDialog}
        initial={editingPayment}
        defaultShop={defaultPayShop}
        shopSuggestions={allShops}
        onSaved={load}
      />

      <AlertDialog open={!!deleteCredit} onOpenChange={(o) => !o && setDeleteCredit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>এন্ট্রি মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteCredit?.item_name}" — এই কাজটি undo করা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCredit} className="press bg-destructive text-destructive-foreground hover:bg-destructive/90">মুছুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePayment} onOpenChange={(o) => !o && setDeletePayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>পেমেন্ট মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletePayment ? `${deletePayment.shop_name} — ${fmtBdt(deletePayment.paid_amount)}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="press bg-destructive text-destructive-foreground hover:bg-destructive/90">মুছুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

const CreditRow = ({ c, fullyPaidShop, onEdit, onDelete, onPay }: {
  c: Credit; fullyPaidShop: boolean;
  onEdit: () => void; onDelete: () => void; onPay: () => void;
}) => (
  <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3 transition-smooth hover:shadow-soft">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning shrink-0">
      <Store className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold truncate">{c.item_name}</h4>
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{c.shop_name}</Badge>
        {fullyPaidShop && (
          <Badge className="h-4 bg-success/15 text-success border-success/30 text-[9px] px-1.5">পরিশোধিত</Badge>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground font-en">
        {toBn(c.quantity)} × {fmtBdt(Number(c.unit_price))}
      </p>
      {c.note && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{c.note}</p>}
    </div>
    <div className="text-right shrink-0">
      <p className="text-sm font-bold text-warning font-en">{fmtBdt(Number(c.total_amount))}</p>
      <div className="mt-1 flex justify-end gap-0.5 opacity-0 transition-smooth group-hover:opacity-100">
        {!fullyPaidShop && (
          <Button size="icon" variant="ghost" className="h-7 w-7 press text-success" onClick={onPay} title="এই দোকানে পরিশোধ">
            <ArrowUpCircle className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 press" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 press text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  </div>
);

const PaymentRow = ({ p, onEdit, onDelete }: { p: Payment; onEdit: () => void; onDelete: () => void; }) => (
  <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3 transition-smooth hover:shadow-soft">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success shrink-0">
      <ArrowUpCircle className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold truncate">{p.shop_name}</h4>
        {p.payment_method && (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{p.payment_method}</Badge>
        )}
      </div>
      {p.note && <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{p.note}</p>}
    </div>
    <div className="text-right shrink-0">
      <p className="text-sm font-bold text-success font-en">{fmtBdt(Number(p.paid_amount))}</p>
      <div className="mt-1 flex justify-end gap-0.5 opacity-0 transition-smooth group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="h-7 w-7 press" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 press text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-xs">{text}</p>
  </div>
);

export default ShopCredit;
