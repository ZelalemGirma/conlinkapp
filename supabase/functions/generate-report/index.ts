import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { period } = await req.json(); // "daily" | "weekly" | "monthly"
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    let periodStart: Date;
    let periodLabel: string;

    if (period === "daily") {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      periodLabel = `Daily Report — ${now.toLocaleDateString("en-US", { dateStyle: "long" })}`;
    } else if (period === "weekly") {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
      periodLabel = `Weekly Report — ${periodStart.toLocaleDateString("en-US", { dateStyle: "medium" })} to ${now.toLocaleDateString("en-US", { dateStyle: "medium" })}`;
    } else {
      periodStart = new Date(now);
      periodStart.setMonth(now.getMonth() - 1);
      periodLabel = `Monthly Report — ${periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
    }

    const periodISO = periodStart.toISOString();

    // Fetch period data
    const [leadsRes, interactionsRes, meetingsRes, profilesRes] = await Promise.all([
      supabase.from("leads").select("*").gte("created_at", periodISO),
      supabase.from("interaction_logs").select("*").gte("created_at", periodISO),
      supabase.from("meetings").select("*").gte("created_at", periodISO),
      supabase.from("profiles").select("user_id, full_name"),
    ]);

    const leads = leadsRes.data || [];
    const interactions = interactionsRes.data || [];
    const meetings = meetingsRes.data || [];
    const profiles = profilesRes.data || [];

    const getName = (uid: string) => profiles.find((p: any) => p.user_id === uid)?.full_name || "Unknown";

    // KPIs
    const totalLeads = leads.length;
    const dealsClosed = leads.filter((l: any) => l.status === "deal_closed").length;
    const conversionRate = totalLeads > 0 ? ((dealsClosed / totalLeads) * 100).toFixed(1) : "0.0";
    const totalInteractions = interactions.length;
    const totalMeetings = meetings.length;

    // Per-rep stats
    const repMap = new Map<string, { leads: number; deals: number; interactions: number; meetings: number }>();
    leads.forEach((l: any) => {
      const rid = l.assigned_rep_id || l.created_by;
      if (!repMap.has(rid)) repMap.set(rid, { leads: 0, deals: 0, interactions: 0, meetings: 0 });
      repMap.get(rid)!.leads++;
      if (l.status === "deal_closed") repMap.get(rid)!.deals++;
    });
    interactions.forEach((i: any) => {
      if (!repMap.has(i.created_by)) repMap.set(i.created_by, { leads: 0, deals: 0, interactions: 0, meetings: 0 });
      repMap.get(i.created_by)!.interactions++;
    });
    meetings.forEach((m: any) => {
      if (!repMap.has(m.created_by)) repMap.set(m.created_by, { leads: 0, deals: 0, interactions: 0, meetings: 0 });
      repMap.get(m.created_by)!.meetings++;
    });

    // Check duplicate attempts
    const { data: dupAttempts } = await supabase
      .from("duplicate_attempts")
      .select("*")
      .gte("attempted_at", periodISO);

    const dupCount = (dupAttempts || []).length;

    // Build HTML report
    const repRows = Array.from(repMap.entries())
      .map(([uid, stats]) => {
        const rate = stats.leads > 0 ? ((stats.deals / stats.leads) * 100).toFixed(0) : "0";
        return `<tr><td>${getName(uid)}</td><td>${stats.leads}</td><td>${stats.deals}</td><td>${rate}%</td><td>${stats.interactions}</td><td>${stats.meetings}</td></tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Conlink ${periodLabel}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;color:#1A2E44;max-width:800px;margin:0 auto}
        h1{color:#F28C28;font-size:22px;border-bottom:3px solid #F28C28;padding-bottom:8px}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
        .kpi{background:#f8f9fa;padding:16px;border-radius:8px;text-align:center;border:1px solid #e9ecef}
        .kpi .value{font-size:28px;font-weight:bold;color:#F28C28}
        .kpi .label{font-size:11px;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #dee2e6;padding:8px;text-align:left;font-size:12px}
        th{background:#1A2E44;color:#fff}
        .alert{background:#fff3cd;border:1px solid #ffc107;padding:12px;border-radius:6px;margin:12px 0;font-size:13px}
        .footer{margin-top:24px;padding-top:12px;border-top:1px solid #dee2e6;font-size:11px;color:#6c757d}
      </style>
    </head><body>
      <h1>Conlink CRM — ${periodLabel}</h1>
      <p style="font-size:12px;color:#6c757d">Generated: ${now.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" })}</p>
      
      <div class="kpi-grid">
        <div class="kpi"><div class="value">${totalLeads}</div><div class="label">New Leads</div></div>
        <div class="kpi"><div class="value">${dealsClosed}</div><div class="label">Deals Closed</div></div>
        <div class="kpi"><div class="value">${conversionRate}%</div><div class="label">Conversion</div></div>
        <div class="kpi"><div class="value">${totalInteractions}</div><div class="label">Interactions</div></div>
      </div>

      ${dupCount > 0 ? `<div class="alert">⚠️ <strong>Discrepancy Alert:</strong> ${dupCount} duplicate entry attempt(s) detected this period.</div>` : ""}
      
      <h2 style="font-size:16px;margin-top:20px">Rep Performance</h2>
      <table>
        <thead><tr><th>Rep</th><th>Leads</th><th>Deals</th><th>Rate</th><th>Interactions</th><th>Meetings</th></tr></thead>
        <tbody>${repRows || '<tr><td colspan="6" style="text-align:center">No activity this period</td></tr>'}</tbody>
      </table>
      
      <div class="footer">Conlink CRM — Automated Performance Report</div>
    </body></html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
