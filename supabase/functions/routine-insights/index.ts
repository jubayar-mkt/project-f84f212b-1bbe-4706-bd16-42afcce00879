import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Routine {
  name: string;
  category: string | null;
  scheduled_time: string | null;
  end_time: string | null;
  scheduled_date: string;
  completed: boolean;
  priority: string;
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

    const body = await req.json().catch(() => ({}));
    const startDate: string = body.startDate;
    const endDate: string = body.endDate;
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Date range required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: routines, error: rerr } = await supabase
      .from("routines")
      .select("name,category,scheduled_time,end_time,scheduled_date,completed,priority")
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate);

    if (rerr) throw rerr;
    const list = (routines ?? []) as Routine[];

    if (list.length < 3) {
      return new Response(
        JSON.stringify({
          summary: "অন্তর্দৃষ্টির জন্য আরও কিছু রুটিন যোগ করুন।",
          highlights: [],
          tips: ["প্রতিদিনের রুটিন পরিকল্পনা করুন।", "নির্দিষ্ট সময় বরাদ্দ করুন।"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const total = list.length;
    const completed = list.filter((r) => r.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Time block productivity (group by hour)
    const hourlyStats = new Map<number, { total: number; done: number }>();
    for (const r of list) {
      if (!r.scheduled_time) continue;
      const hour = parseInt(r.scheduled_time.split(":")[0], 10);
      const cur = hourlyStats.get(hour) ?? { total: 0, done: 0 };
      cur.total++;
      if (r.completed) cur.done++;
      hourlyStats.set(hour, cur);
    }
    const hourlyArr = Array.from(hourlyStats.entries())
      .map(([h, s]) => ({ hour: h, rate: Math.round((s.done / s.total) * 100), total: s.total }))
      .filter((x) => x.total >= 2)
      .sort((a, b) => b.rate - a.rate);
    const bestHour = hourlyArr[0];
    const worstHour = hourlyArr[hourlyArr.length - 1];

    // Category breakdown
    const catMap = new Map<string, { total: number; done: number }>();
    for (const r of list) {
      const c = r.category || "অন্যান্য";
      const cur = catMap.get(c) ?? { total: 0, done: 0 };
      cur.total++;
      if (r.completed) cur.done++;
      catMap.set(c, cur);
    }
    const categories = Array.from(catMap.entries()).map(([name, s]) => ({
      name,
      total: s.total,
      done: s.done,
      rate: Math.round((s.done / s.total) * 100),
    }));

    // Day of week
    const dayStats = new Array(7).fill(0).map(() => ({ total: 0, done: 0 }));
    for (const r of list) {
      const d = new Date(r.scheduled_date);
      const dow = d.getDay();
      dayStats[dow].total++;
      if (r.completed) dayStats[dow].done++;
    }
    const dayNames = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
    const dayRates = dayStats
      .map((s, i) => ({ day: dayNames[i], rate: s.total ? Math.round((s.done / s.total) * 100) : 0, total: s.total }))
      .filter((x) => x.total > 0);
    const bestDay = [...dayRates].sort((a, b) => b.rate - a.rate)[0];
    const worstDay = [...dayRates].sort((a, b) => a.rate - b.rate)[0];

    const summaryData = {
      date_range: { start: startDate, end: endDate },
      total_routines: total,
      completed,
      missed: total - completed,
      completion_rate_pct: completionRate,
      best_time_block: bestHour ? `${bestHour.hour}:00 (${bestHour.rate}%)` : null,
      weakest_time_block: worstHour && worstHour !== bestHour ? `${worstHour.hour}:00 (${worstHour.rate}%)` : null,
      best_day: bestDay ? `${bestDay.day} (${bestDay.rate}%)` : null,
      worst_day: worstDay && worstDay !== bestDay ? `${worstDay.day} (${worstDay.rate}%)` : null,
      categories: categories.sort((a, b) => b.total - a.total).slice(0, 6),
    };

    const systemPrompt = `তুমি একজন বাংলা productivity coach। ব্যবহারকারীর রুটিন পরিসংখ্যান বিশ্লেষণ করে চমৎকার, সংক্ষিপ্ত ও কার্যকর পরামর্শ দাও সহজ বাংলায়। সংখ্যা ইংরেজিতে রাখো (যেমন: 8:00 AM, 75%)। JSON tool কল ব্যবহার করো।`;

    const userPrompt = `নির্বাচিত সময়কালের রুটিন সারসংক্ষেপ:
${JSON.stringify(summaryData, null, 2)}

বিশ্লেষণ দাও:
1. summary: ২-৩ লাইনে সামগ্রিক চিত্র
2. highlights: ৩-৪টি গুরুত্বপূর্ণ পর্যবেক্ষণ (সেরা সময়, দুর্বল প্যাটার্ন, ক্যাটাগরি)
3. tips: ৩টি কার্যকর পরামর্শ productivity বাড়ানোর জন্য`;

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
              name: "report_routine_insights",
              description: "Return Bangla routine analytics insights",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
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
                required: ["summary", "highlights", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_routine_insights" } },
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

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("routine-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});