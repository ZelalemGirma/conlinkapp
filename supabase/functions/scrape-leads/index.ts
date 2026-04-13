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

function extractDetailUrls(html: string): string[] {
  // Match all detail page links (directory/DIGITS-slug pattern)
  const regex = /href="(https?:\/\/www\.2merkato\.com\/directory\/\d+-[^"]+)"/gi;
  const urls = new Set<string>();
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    // Skip category pages (just numbers, no slug)
    const u = match[1];
    if (u.match(/\/directory\/\d+-/)) {
      urls.add(u);
    }
  }
  console.log(`Extracted ${urls.size} detail URLs from listing page`);
  return [...urls].slice(0, 20);
}

async function fetchPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ConlinkBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

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

    const mainHtml = await fetchPage(formattedUrl);
    if (!mainHtml) {
      return new Response(JSON.stringify({ error: "Failed to fetch URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a directory/listing page with detail links
    const detailUrls = extractDetailUrls(mainHtml, formattedUrl);
    
    let combinedText = "";
    
    if (detailUrls.length > 0) {
      console.log(`Found ${detailUrls.length} detail pages, fetching each...`);
      
      // Fetch detail pages in parallel (batches of 5)
      const detailTexts: string[] = [];
      for (let i = 0; i < detailUrls.length; i += 5) {
        const batch = detailUrls.slice(i, i + 5);
        const results = await Promise.all(batch.map(async (dUrl) => {
          const html = await fetchPage(dUrl);
          return html ? `--- DETAIL PAGE: ${dUrl} ---\n${stripHtml(html)}` : "";
        }));
        detailTexts.push(...results.filter(Boolean));
      }
      
      // Combine listing page + all detail pages
      combinedText = stripHtml(mainHtml) + "\n\n" + detailTexts.join("\n\n");
    } else {
      combinedText = stripHtml(mainHtml);
    }

    const rawText = combinedText.substring(0, 15000);

    // Pass to AI for intelligent extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a data extraction AI for a construction industry CRM called Conlink. 
Given raw website text (which may include multiple detail pages), extract ALL potential business leads (companies) you can find.

IMPORTANT: The text may contain data from a LISTING page AND individual DETAIL pages. The detail pages have COMPLETE phone numbers and full addresses. Always prefer the COMPLETE data from detail pages over truncated data from listing pages.

For each company found, extract:
- company_name: The company's legal/trade name
- primary_phone: Main phone/mobile number. Ethiopian numbers must be complete with 9-10 digits after +251 (e.g., +251 911 234 567). If only a truncated number is available, set to empty "".
- secondary_phone: Alternative phone if available (same rules)
- email: Business email
- address: Full physical address from the detail page
- location_zone: District/area name (e.g., Bole, Kirkos, Yeka, Nifas Silk for Addis Ababa)
- category: Best match from these 16 categories: ${CATEGORIES.join(", ")}
- relevance_score: 1-100 score of how well the company fits the CONSTRUCTION industry
- reasoning: Brief explanation (e.g., "Matched to 'Construction Firms' — Grade 1 Building Contractor")
- priority: "high" if relevance_score >= 60, "medium" if 30-59, "low" if < 30

If the company is clearly NOT construction-related, set priority to "low" and relevance_score below 30.

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
          { role: "user", content: `Extract business leads from this website data:\n\n${rawText}` },
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

    console.log(`Extracted ${normalizedLeads.length} leads`);

    return new Response(JSON.stringify({
      success: true,
      leads: normalizedLeads,
      raw_text: rawText.substring(0, 5000),
      detail_pages_fetched: detailUrls.length,
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
