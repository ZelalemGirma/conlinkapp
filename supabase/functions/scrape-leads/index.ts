import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const CATEGORIES = [
  "Building Materials", "Electrical & Power", "Electro Mechanical",
  "Conveying Systems", "Solar Technology", "Specialities",
  "Metal & Industrial Engineering", "Pre-Engineered System",
  "Road Construction Materials", "Geological Systems",
  "Construction Machinery", "Land and Building Development",
  "Consultants", "Construction Firms",
  "Interior Design & Architecture", "Financial Service",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Fetching URL:", formattedUrl);

    const response = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ConlinkBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch URL: ${response.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await response.text();

    // Strip HTML to text
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    const rawText = textContent.substring(0, 8000);

    // Pass to AI for intelligent extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a data extraction AI for a construction industry CRM called Conlink. 
Given raw website text, extract ALL potential business leads (companies) you can find.

For each company found, extract:
- company_name: The company's legal/trade name
- primary_phone: Main phone/mobile number. IMPORTANT: Ethiopian phone numbers must be complete — they should have 10 digits after the country code (e.g., +251 911 234 567). If a number appears truncated or incomplete (e.g., "+251 93 99 28" which is too short), set it to empty string "" rather than storing a partial number. Only include numbers that look complete and valid.
- secondary_phone: Alternative phone if available (same completeness rules apply)
- email: Business email
- address: Physical address
- location_zone: District/area name if identifiable (e.g., Bole, Kirkos, Yeka for Addis Ababa)
- category: Best match from these 16 categories: ${CATEGORIES.join(", ")}
- relevance_score: 1-100 score of how well the company fits the CONSTRUCTION industry
- reasoning: Brief explanation of categorization and relevance (e.g., "Matched to 'Building Materials' based on keyword 'Cement' found on site"). If the phone number was incomplete/truncated on the source, mention that.
- priority: "high" if relevance_score >= 60, "medium" if 30-59, "low" if < 30

If the company is clearly NOT construction-related (bakery, retail shop, restaurant, etc.), set priority to "low" and relevance_score below 30.

Return results as a JSON array under the key "leads".`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract business leads from this website text:\n\n${rawText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_leads",
              description: "Extract structured lead data from website text",
              parameters: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        company_name: { type: "string" },
                        primary_phone: { type: "string" },
                        secondary_phone: { type: "string" },
                        email: { type: "string" },
                        address: { type: "string" },
                        location_zone: { type: "string" },
                        category: { type: "string", enum: CATEGORIES },
                        relevance_score: { type: "number", minimum: 1, maximum: 100 },
                        reasoning: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["company_name", "relevance_score", "reasoning", "priority"],
                    },
                  },
                },
                required: ["leads"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_leads" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let leads: any[] = [];

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        leads = parsed.leads || [];
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    // Normalize leads
    const normalizedLeads = leads.map((l: any) => ({
      company_name: l.company_name || "",
      contact_person: "",
      phone: l.primary_phone || "",
      secondary_phone: l.secondary_phone || "",
      email: l.email || "",
      address: l.address || "",
      location_zone: l.location_zone || "",
      category: CATEGORIES.includes(l.category) ? l.category : "",
      relevance_score: Math.max(1, Math.min(100, l.relevance_score || 0)),
      ai_reasoning: l.reasoning || "",
      priority: ["high", "medium", "low"].includes(l.priority) ? l.priority : "medium",
    }));

    // Fallback if AI returned nothing
    if (normalizedLeads.length === 0) {
      normalizedLeads.push({
        company_name: "",
        contact_person: "",
        phone: "",
        secondary_phone: "",
        email: "",
        address: "",
        location_zone: "",
        category: "",
        relevance_score: 0,
        ai_reasoning: "No leads could be extracted from this page.",
        priority: "low",
      });
    }

    return new Response(JSON.stringify({
      success: true,
      leads: normalizedLeads,
      raw_text: rawText.substring(0, 5000),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed to scrape" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
