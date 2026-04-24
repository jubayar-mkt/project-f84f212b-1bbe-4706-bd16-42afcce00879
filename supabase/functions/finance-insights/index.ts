import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Txn {
  type: "income" | "expense";
  amount: number;
  category: string;
  transaction_date: string;
  note: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase env not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 60 days for current vs previous comparison
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data: txns, error: txnError } = await supabase
      .from("transactions")
      .select("type,amount,category,transaction_date,note")
      .gte("transaction_date", sinceStr);

    if (txnError) throw txnError;

    const list = (txns ?? []) as Txn[];
    if (list.length < 3) {
      return new Response(
        JSON.stringify({
          summary: "অন্তর্দৃষ্টির জন্য আরও কিছু লেনদেন যোগ করুন।",
          savingsRate: 0,
          highlights: [],
          tips: ["প্রতিদিনের আয়-ব্যয় নথিভুক্ত করুন।", "নিয়মিত ব্যয়ের ক্যাটাগরি ট্র্যাক করুন।"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Aggregate stats for the prompt
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(today.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const recent = list.filter((t) => t.transaction_date >= cutoffStr);
    const prior = list.filter((t) => t.transaction_date < cutoffStr);

    const sum = (arr: Txn[], type: "income" | "expense") =>
      arr.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0);

    const recentIncome = sum(recent, "income");
    const recentExpense = sum(recent, "expense");
    const priorExpense = sum(prior, "expense");

    const byCategory = new Map<string, number>();
    for (const t of recent.filter((x) => x.type === "expense")) {
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + Number(t.amount));
    }
    const categoryBreakdown = Array.from(byCategory.entries())
      .map(([c, v]) => ({ category: c, amount: Math.round(v) }))
      .sort((a, b) => b.amount - a.amount);

    const priorByCat = new Map<string, number>();
    for (const t of prior.filter((x) => x.type === "expense")) {
      priorByCat.set(t.category, (priorByCat.get(t.category) ?? 0) + Number(t.amount));
    }

    const summary = {
      recent_income: Math.round(recentIncome),
      recent_expense: Math.round(recentExpense),
      balance: Math.round(recentIncome - recentExpense),
      savings_rate_pct: recentIncome > 0 ? Math.round(((recentIncome - recentExpense) / recentIncome) * 100) : 0,
      expense_change_vs_prior_pct:
        priorExpense > 0 ? Math.round(((recentExpense - priorExpense) / priorExpense) * 100) : null,
      transaction_count: recent.length,
      category_breakdown: categoryBreakdown,
      category_changes: categoryBreakdown.map((c) => ({
        category: c.category,
        recent: c.amount,
        prior: Math.round(priorByCat.get(c.category) ?? 0),
      })),
    };

    const systemPrompt = `তুমি একজন অভিজ্ঞ বাংলা আর্থিক পরামর্শক। ব্যবহারকারীর গত ৩০ দিনের লেনদেনের সারসংক্ষেপ দেখে চমৎকার, সংক্ষিপ্ত ও কার্যকর পরামর্শ দাও। সব উত্তর অবশ্যই সহজ বাংলায় হবে। সংখ্যা বাংলা সংখ্যায় না দিয়ে ইংরেজি সংখ্যাতেই রাখো (যেমন: ৳ 12,500)। JSON tool কল ব্যবহার করে structured output দাও।`;

    const userPrompt = `গত ৩০ দিনের সারসংক্ষেপ:
${JSON.stringify(summary, null, 2)}

এই ডেটা বিশ্লেষণ করে দাও:
1. summary: ২-৩ লাইনে সামগ্রিক আর্থিক চিত্র
2. highlights: ৩-৪টি গুরুত্বপূর্ণ পর্যবেক্ষণ (anomaly, বড় পরিবর্তন, প্যাটার্ন)
3. tips: ৩টি কার্যকর পরামর্শ
4. savings_assessment: সঞ্চয় হার সম্পর্কে এক লাইনের মূল্যায়ন`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_insights",
              description: "Return Bangla financial insights",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "২-৩ লাইনের সামগ্রিক চিত্র" },
                  savings_assessment: { type: "string", description: "সঞ্চয় হার মূল্যায়ন" },
                  highlights: {
                    type: "array",
                    minItems: 2,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        detail: { type: "string" },
                        severity: { type: "string", enum: ["info", "warning", "success"] },
                      },
                      required: ["title", "detail", "severity"],
                      additionalProperties: false,
                    },
                  },
                  tips: {
                    type: "array",
                    minItems: 2,
                    maxItems: 5,
                    items: { type: "string" },
                  },
                },
                required: ["summary", "savings_assessment", "highlights", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_insights" } },
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "অনুরোধ সীমা অতিক্রান্ত। কিছুক্ষণ পরে আবার চেষ্টা করুন।" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "AI ক্রেডিট শেষ। কর্মক্ষেত্রে ক্রেডিট যোগ করুন।" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResponse.ok) {
      const txt = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, txt);
      throw new Error("AI gateway error");
    }

    const data = await aiResponse.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) throw new Error("AI ফলাফল পার্স করা যায়নি");
    const insights = JSON.parse(args);

    return new Response(
      JSON.stringify({
        ...insights,
        savingsRate: summary.savings_rate_pct,
        balance: summary.balance,
        income: summary.recent_income,
        expense: summary.recent_expense,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("finance-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
