import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get unscored interactions
    const { data: interactions, error: fetchErr } = await supabase
      .from("interaction_logs")
      .select("id, type, notes, created_by")
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchErr) throw fetchErr;

    // Get already scored
    const { data: existingScores } = await supabase
      .from("interaction_scores")
      .select("interaction_id");

    const scoredIds = new Set((existingScores || []).map((s: any) => s.interaction_id));
    const unscored = (interactions || []).filter((i: any) => !scoredIds.has(i.id));

    if (unscored.length === 0) {
      return new Response(JSON.stringify({ message: "No new interactions to score", scored: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch analyze with AI
    const batchPrompt = unscored.map((i: any, idx: number) => 
      `${idx + 1}. [Type: ${i.type}] "${i.notes}"`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You analyze CRM interaction notes for quality. For each note, return a JSON object with: effort_score (1-10, where 1=lazy/empty, 10=detailed/actionable), sentiment (positive/neutral/negative), quality_label (low/medium/high). Consider: detail level, actionability, follow-up mention, specifics vs vagueness. Return a JSON array of objects matching the input order.`
          },
          {
            role: "user",
            content: `Analyze these interaction notes:\n${batchPrompt}\n\nReturn ONLY a JSON array like: [{"effort_score":7,"sentiment":"positive","quality_label":"high","analysis":"Brief reason"}]`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_interactions",
            description: "Score interaction notes for quality",
            parameters: {
              type: "object",
              properties: {
                scores: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      effort_score: { type: "integer", minimum: 1, maximum: 10 },
                      sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                      quality_label: { type: "string", enum: ["low", "medium", "high"] },
                      analysis: { type: "string" }
                    },
                    required: ["effort_score", "sentiment", "quality_label"],
                    additionalProperties: false
                  }
                }
              },
              required: ["scores"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "score_interactions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let scores: any[] = [];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      scores = parsed.scores || [];
    }

    // Insert scores
    let scored = 0;
    for (let idx = 0; idx < Math.min(unscored.length, scores.length); idx++) {
      const interaction = unscored[idx];
      const score = scores[idx];
      
      const { error: insertErr } = await supabase
        .from("interaction_scores")
        .upsert({
          interaction_id: interaction.id,
          effort_score: Math.max(1, Math.min(10, score.effort_score || 5)),
          sentiment: score.sentiment || "neutral",
          quality_label: score.quality_label || "medium",
          analysis_notes: score.analysis || "",
        }, { onConflict: "interaction_id" });

      if (!insertErr) scored++;
    }

    // Pattern recognition: flag high-activity-low-conversion reps
    const { data: allLeads } = await supabase.from("leads").select("id, status, created_by, assigned_rep_id");
    const { data: allInteractions } = await supabase.from("interaction_logs").select("created_by");

    const repStats = new Map<string, { interactions: number; deals: number }>();
    (allInteractions || []).forEach((i: any) => {
      if (!repStats.has(i.created_by)) repStats.set(i.created_by, { interactions: 0, deals: 0 });
      repStats.get(i.created_by)!.interactions++;
    });
    (allLeads || []).forEach((l: any) => {
      const repId = l.assigned_rep_id || l.created_by;
      if (!repStats.has(repId)) repStats.set(repId, { interactions: 0, deals: 0 });
      if (l.status === "deal_closed") repStats.get(repId)!.deals++;
    });

    const flags: string[] = [];
    repStats.forEach((stats, repId) => {
      if (stats.interactions > 10 && stats.deals === 0) {
        flags.push(`Rep ${repId}: ${stats.interactions} interactions but 0 deals`);
      }
    });

    return new Response(JSON.stringify({ scored, flags, total_unscored: unscored.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
