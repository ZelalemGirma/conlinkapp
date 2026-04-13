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

// Ethiopian business directories and search sources
const SEARCH_SOURCES = [
  {
    name: "2merkato",
    buildUrl: (q: string) => `https://www.2merkato.com/directory?q=${encodeURIComponent(q)}`,
  },
  {
    name: "ethiopianbusinessreview",
    buildUrl: (q: string) => `https://ethiopianbusinessreview.net/?s=${encodeURIComponent(q)}`,
  },
  {
    name: "addisbiz",
    buildUrl: (q: string) => `https://addisbiz.com/?s=${encodeURIComponent(q)}`,
  },
  {
    name: "google_et",
    buildUrl: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q + " Ethiopia company site:.et OR site:2merkato.com")}&num=20`,
  },
];

function extractPhoneNumbers(html: string): string[] {
  const phones: string[] = [];
  let m;

  const telRegex = /href="tel:([^"]+)"/gi;
  while ((m = telRegex.exec(html)) !== null) phones.push(m[1].trim());

  const dataRegex = /data-(?:phone|mobile|tel)[=:]"?([^">\s]+)/gi;
  while ((m = dataRegex.exec(html)) !== null) phones.push(m[1].trim());

  const ethRegex = /(?:\+251|0)[\s.-]?(?:9|1[1-9])\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g;
  const stripped = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  while ((m = ethRegex.exec(stripped)) !== null) phones.push(m[0].trim());

  return [...new Set(phones)];
}

function extractEmails(html: string): string[] {
  const emails: string[] = [];
  let m;

  // mailto: links
  const mailtoRegex = /href="mailto:([^"?]+)"/gi;
  while ((m = mailtoRegex.exec(html)) !== null) emails.push(m[1].trim().toLowerCase());

  // data-email attributes
  const dataRegex = /data-email[=:]"?([^">\s]+)/gi;
  while ((m = dataRegex.exec(html)) !== null) emails.push(m[1].trim().toLowerCase());

  // Email pattern in visible text
  const stripped = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  while ((m = emailRegex.exec(stripped)) !== null) {
    const e = m[0].toLowerCase();
    if (!e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".gif") && !e.includes("example.com")) {
      emails.push(e);
    }
  }

  return [...new Set(emails)];
}

function extractUrls(html: string, baseOrigin: string): string[] {
  const regex = /href="(https?:\/\/[^"]+)"/gi;
  const urls = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    const u = match[1];
    // Filter for potentially relevant detail pages
    if (
      u.includes("2merkato.com/directory/") ||
      u.includes("addisbiz.com/") ||
      u.includes(".et/")
    ) {
      urls.add(u);
    }
  }
  return [...urls].slice(0, 15); // Cap at 15 detail URLs
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

async function fetchPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, sources } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Search query is required (min 2 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchQuery = query.trim();
    console.log("Search query:", searchQuery);

    // Determine which sources to use
    const activeSources = sources?.length
      ? SEARCH_SOURCES.filter((s) => sources.includes(s.name))
      : SEARCH_SOURCES;

    // Step 1: Fetch search results from all sources in parallel
    const searchResults = await Promise.all(
      activeSources.map(async (source) => {
        const url = source.buildUrl(searchQuery);
        console.log(`Searching ${source.name}: ${url}`);
        const html = await fetchPage(url);
        if (!html) return { source: source.name, text: "", detailUrls: [] };

        const baseOrigin = new URL(url).origin;
        const detailUrls = extractUrls(html, baseOrigin);
        return {
          source: source.name,
          text: stripHtml(html).substring(0, 5000),
          detailUrls,
        };
      })
    );

    // Step 2: Fetch detail pages (up to 20 total across all sources)
    const allDetailUrls = searchResults.flatMap((r) => r.detailUrls).slice(0, 20);
    console.log(`Found ${allDetailUrls.length} detail URLs across sources`);

    const detailTexts: string[] = [];
    for (let i = 0; i < allDetailUrls.length; i += 5) {
      const batch = allDetailUrls.slice(i, i + 5);
      const results = await Promise.all(
        batch.map(async (dUrl) => {
          const html = await fetchPage(dUrl);
          if (!html) return "";
          const phones = extractPhoneNumbers(html);
          const emails = extractEmails(html);
          const phoneInfo =
            phones.length > 0 ? `\nEXTRACTED PHONE NUMBERS: ${phones.join(", ")}` : "";
          const emailInfo =
            emails.length > 0 ? `\nEXTRACTED EMAILS: ${emails.join(", ")}` : "";
          return `--- DETAIL PAGE: ${dUrl} ---${phoneInfo}${emailInfo}\n${stripHtml(html)}`;
        })
      );
      detailTexts.push(...results.filter(Boolean));
    }

    // Combine all text
    const searchTexts = searchResults
      .filter((r) => r.text)
      .map((r) => `--- SOURCE: ${r.source} ---\n${r.text}`)
      .join("\n\n");

    const rawText = (searchTexts + "\n\n" + detailTexts.join("\n\n")).substring(0, 35000);

    if (rawText.trim().length < 50) {
      return new Response(
        JSON.stringify({
          success: true,
          leads: [],
          message: "No results found for this search query.",
          sources_searched: activeSources.map((s) => s.name),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: AI extraction & scoring
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a data extraction AI for Conlink, a construction-industry CRM in Ethiopia.
Given search results from multiple Ethiopian web sources, extract ALL business leads (companies) you find.

SEARCH QUERY: "${searchQuery}"

SCORING RULES — Autonomous Category Matching:
For each company, score it against these 16 Conlink categories:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Assign the BEST matching category. If a company fits multiple categories, choose the primary one.
Set relevance_score (1-100) based on:
- How well the company matches ANY of the 16 categories (40%)
- How relevant it is to the search query (30%)
- Completeness of contact info found (30%)

PHONE NUMBER RULES:
1. Lines with "EXTRACTED PHONE NUMBERS:" are most reliable — always prefer these.
2. Ethiopian numbers: 10 digits with 0 prefix or +251 format. Never guess missing digits.
3. If phone is incomplete, leave empty.

PRIORITY:
- "high": relevance_score >= 60 AND matches a category well
- "medium": relevance_score 30-59
- "low": relevance_score < 30 OR clearly unrelated to construction

Return ALL companies found, even low-relevance ones — let the user decide what to keep.`;

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
          { role: "user", content: `Extract and score business leads from these search results:\n\n${rawText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_leads",
              description: "Extract and score business leads from search results",
              parameters: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        company_name: { type: "string" },
                        contact_person: { type: "string" },
                        primary_phone: { type: "string" },
                        secondary_phone: { type: "string" },
                        email: { type: "string" },
                        address: { type: "string" },
                        location_zone: { type: "string" },
                        category: { type: "string", enum: CATEGORIES },
                        relevance_score: { type: "number", minimum: 1, maximum: 100 },
                        reasoning: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        source_url: { type: "string" },
                      },
                      required: ["company_name", "category", "relevance_score", "reasoning", "priority"],
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

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
      contact_person: l.contact_person || "",
      phone: l.primary_phone || "",
      secondary_phone: l.secondary_phone || "",
      email: l.email || "",
      address: l.address || "",
      location_zone: l.location_zone || "",
      category: CATEGORIES.includes(l.category) ? l.category : "",
      relevance_score: Math.max(1, Math.min(100, l.relevance_score || 0)),
      ai_reasoning: l.reasoning || "",
      priority: ["high", "medium", "low"].includes(l.priority) ? l.priority : "medium",
      source_url: l.source_url || "",
    }));

    console.log(`Search "${searchQuery}" → ${normalizedLeads.length} leads from ${activeSources.length} sources, ${allDetailUrls.length} detail pages`);

    return new Response(
      JSON.stringify({
        success: true,
        leads: normalizedLeads,
        sources_searched: activeSources.map((s) => s.name),
        detail_pages_fetched: allDetailUrls.length,
        raw_text: rawText.substring(0, 3000),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
