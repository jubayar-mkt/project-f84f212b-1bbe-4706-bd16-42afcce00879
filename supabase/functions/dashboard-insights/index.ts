import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const today = todayStr();
    const since14 = daysAgo(13);
    const mStart = monthStart();

    const [tplR, cmpR, hR, ciR, txR] = await Promise.all([
      supabase.from("routine_templates").select("id,name,start_time,end_time,effective_from").eq("user_id", user.id).is("archived_at", null).lte("effective_from", today),
      supabase.from("routine_completions").select("template_id,completion_date,completed,skipped").eq("user_id", user.id).gte("completion_date", since14),
      supabase.from("habits").select("id,name,target_per_day").eq("user_id", user.id).eq("active", true),
      supabase.from("habit_checkins").select("habit_id,checkin_date,count").eq("user_id", user.id).gte("checkin_date", since14),
      supabase.from("transactions").select("type,amount,category,transaction_date").eq("user_id", user.id).gte("transaction_date", mStart),
    ]);

    const tpls = tplR.data ?? [];
    const cmps = cmpR.data ?? [];
    const habits = hR.data ?? [];
    const ci = ciR.data ?? [];
    const tx = txR.data ?? [];

    // Routine 14-day rate
    let totalEligible = 0, totalDone = 0;
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const eligible = tpls.filter((t: any) => t.effective_from <= ds).length;
      const dayCmps = cmps.filter((c: any) => c.completion_date === ds);
      const skipped = dayCmps.filter((c: any) => c.skipped).length;
      const done = dayCmps.filter((c: any) => c.completed).length;
      totalEligible += Math.max(0, eligible - skipped);
      totalDone += done;
    }
    const routineRate = totalEligible ? Math.round((totalDone / totalEligible) * 100) : 0;

    // Today routine completion
    const todayTpls = tpls.length;
    const todayCmps = cmps.filter((c: any) => c.completion_date === today);
    const todaySkipped = todayCmps.filter((c: any) => c.skipped).length;
    const todayDone = todayCmps.filter((c: any) => c.completed).length;
    const todayPct = (todayTpls - todaySkipped) > 0 ? Math.round((todayDone / (todayTpls - todaySkipped)) * 100) : 0;

    // Habit consistency: avg fill ratio across last 7 days
    const habitTotals = habits.map((h: any) => {
      const dayHits = new Set(ci.filter((c: any) => c.habit_id === h.id).map((c: any) => c.checkin_date));
      return { name: h.name, daysHit: dayHits.size };
    });
    const totalHabitHits = ci.reduce((s: number, c: any) => s + Number(c.count || 0), 0);

    // Finance summary (this month)
    const inc = tx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const exp = tx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const balance = inc - exp;
    const savingsRate = inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;
    const expByCat: Record<string, number> = {};
    for (const t of tx.filter((x: any) => x.type === "expense")) {
      expByCat[t.category] = (expByCat[t.category] ?? 0) + Number(t.amount);
    }
    const topCat = Object.entries(expByCat).sort((a, b) => b[1] - a[1])[0];

    const context = {
      routine: { last14DaysRate: routineRate, todayCompletionPct: todayPct, todayDone, todayTotal: todayTpls - todaySkipped },
      habits: { active: habits.length, last14DaysCheckins: totalHabitHits, perHabit: habitTotals },
      finance: { monthIncome: inc, monthExpense: exp, monthBalance: balance, savingsRate, topExpenseCategory: topCat ? { name: topCat[0], amount: topCat[1] } : null },
    };

    const systemPrompt = `তুমি একজন বাংলাভাষী productivity ও আর্থিক কোচ। ব্যবহারকারীর গত ১৪ দিনের রুটিন, অভ্যাস ও চলতি মাসের আর্থিক ডেটা দেখে সংক্ষিপ্ত, কার্যকর পরামর্শ দাও। সব আউটপুট অবশ্যই বাংলায় হবে। ভাষা হবে উষ্ণ, সরাসরি ও practical। প্রযুক্তিগত শব্দ (productivity, streak, balance) ইংরেজিতে রাখা যেতে পারে।`;

    const tools = [{
      type: "function",
      function: {
        name: "give_daily_insight",
        description: "Generate a structured daily dashboard insight in Bangla.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "১-২ লাইনের সামগ্রিক বাংলা সারাংশ" },
            productivity: { type: "string", description: "আজকের productivity ফোকাস (১ লাইন)" },
            habit: { type: "string", description: "অভ্যাস উন্নতির পরামর্শ (১ লাইন)" },
            spending: { type: "string", description: "খরচ সচেতনতা টিপ (১ লাইন)" },
          },
          required: ["summary", "productivity", "habit", "spending"],
          additionalProperties: false,
        },
      },
    }];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `নিচের ডেটা বিশ্লেষণ করে আজকের জন্য পরামর্শ দাও:\n${JSON.stringify(context, null, 2)}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "give_daily_insight" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "অনেক রিকোয়েস্ট হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI ক্রেডিট শেষ — ওয়ার্কস্পেসে ফান্ড যোগ করুন" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const json = await aiResp.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    if (!parsed) throw new Error("AI ফলাফল parse করা যায়নি");

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("dashboard-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});