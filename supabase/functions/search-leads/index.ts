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

// Multiple Ethiopian web sources for search
const SEARCH_SOURCES = [
  {
    name: "2merkato",
    buildUrl: (q: string) => `https://www.2merkato.com/directory?q=${encodeURIComponent(q)}`,
    detailPattern: /href="((?:https?:\/\/[^"]*)?\/directory\/\d+-[^"]+)"/gi,
  },
  {
    name: "ethiobiz",
    buildUrl: (q: string) => `https://www.ethiobiz.com/?s=${encodeURIComponent(q)}`,
    detailPattern: /href="(https?:\/\/(?:www\.)?ethiobiz\.com\/[^"]*listing[^"]*)"/gi,
  },
  {
    name: "addisbiz",
    buildUrl: (q: string) => `https://addisbiz.com/?s=${encodeURIComponent(q)}`,
    detailPattern: /href="(https?:\/\/addisbiz\.com\/(?!tag|category|wp-)[^"]+)"/gi,
  },
  {
    name: "duckduckgo",
    buildUrl: (q: string) =>
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q + " Ethiopia company phone email site:.et OR site:2merkato.com OR site:ethiobiz.com")}`,
    detailPattern: /href="(https?:\/\/(?:www\.)?(?:2merkato\.com\/directory|ethiobiz\.com|addisbiz\.com|[^"]*\.et)\/[^"]+)"/gi,
  },
];

function extractPhoneNumbers(html: string): string[] {
  const phones: string[] = [];
  let m;

  const telRegex = /href="tel:([^"]+)"/gi;
  while ((m = telRegex.exec(html)) !== null) phones.push(m[1].trim());

  const dataRegex = /data-(?:phone|mobile|tel)[=:]"?([^">\s]+)/gi;
  while ((m = dataRegex.exec(html)) !== null) phones.push(m[1].trim());

  // Ethiopian phone patterns - broader matching
  const stripped = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  const ethRegex = /(?:\+251|0)[\s.-]?(?:9\d|1[1-9]\d)[\s.-]?\d{2,3}[\s.-]?\d{2,4}[\s.-]?\d{0,4}/g;
  while ((m = ethRegex.exec(stripped)) !== null) {
    const cleaned = m[0].replace(/[\s.-]/g, "");
    // Must be 10 digits (with 0) or 12-13 digits (with +251)
    if ((cleaned.startsWith("0") && cleaned.length >= 10) ||
        (cleaned.startsWith("+251") && cleaned.length >= 13)) {
      phones.push(m[0].trim());
    }
  }

  return [...new Set(phones)];
}

function extractEmails(html: string): string[] {
  const emails: string[] = [];
  let m;

  const mailtoRegex = /href="mailto:([^"?]+)"/gi;
  while ((m = mailtoRegex.exec(html)) !== null) emails.push(m[1].trim().toLowerCase());

  const dataRegex = /data-email[=:]"?([^">\s]+)/gi;
  while ((m = dataRegex.exec(html)) !== null) emails.push(m[1].trim().toLowerCase());

  const stripped = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  while ((m = emailRegex.exec(stripped)) !== null) {
    const e = m[0].toLowerCase();
    if (!e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".gif") &&
        !e.includes("example.com") && !e.includes("noreply") && !e.includes("wordpress")) {
      emails.push(e);
    }
  }

  return [...new Set(emails)];
}

function extractDetailUrls(html: string, pattern: RegExp, baseOrigin: string): string[] {
  const urls = new Set<string>();
  let match;
  // Reset regex state
  pattern.lastIndex = 0;
  while ((match = pattern.exec(html)) !== null) {
    let u = match[1];
    if (u.startsWith("/")) u = baseOrigin + u;
    if (u.startsWith("http")) urls.add(u);
  }
  return [...urls];
}

// Also extract any .et domain links and known directory links generically
function extractGenericUrls(html: string): string[] {
  const urls = new Set<string>();
  const regex = /href="(https?:\/\/[^"]+)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const u = match[1];
    if (
      (u.includes("2merkato.com/directory/") && u.match(/\/\d+-/)) ||
      u.includes("ethiobiz.com/") ||
      u.includes("addisbiz.com/") ||
      (u.match(/\.et\//) && !u.includes("google") && !u.includes("facebook") && !u.includes("twitter"))
    ) {
      urls.add(u);
    }
  }
  return [...urls];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return "";
    }
    return await response.text();
  } catch (e) {
    console.log(`Fetch error for ${url}: ${e instanceof Error ? e.message : "unknown"}`);
    return "";
  }
}

// DuckDuckGo returns redirect URLs - extract the real URL
function extractDDGUrls(html: string): string[] {
  const urls: string[] = [];
  // DuckDuckGo HTML results have uddg= parameter with the real URL
  const regex = /uddg=(https?[^&"]+)/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    try {
      const decoded = decodeURIComponent(m[1]);
      if (!decoded.includes("duckduckgo.com") && !decoded.includes("google.com")) {
        urls.push(decoded);
      }
    } catch { /* skip bad URLs */ }
  }
  return urls;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Search query is required (min 2 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchQuery = query.trim();
    console.log("Search query:", searchQuery);

    // Step 1: Fetch search results from all sources in parallel
    const searchResults = await Promise.all(
      SEARCH_SOURCES.map(async (source) => {
        const url = source.buildUrl(searchQuery);
        console.log(`Searching ${source.name}: ${url}`);
        const html = await fetchPage(url);
        if (!html) {
          console.log(`${source.name}: empty response`);
          return { source: source.name, html: "", text: "", detailUrls: [] };
        }

        let detailUrls: string[];
        if (source.name === "duckduckgo") {
          // Extract real URLs from DuckDuckGo redirect links
          detailUrls = extractDDGUrls(html);
          console.log(`${source.name}: found ${detailUrls.length} DDG result URLs`);
        } else {
          const baseOrigin = new URL(url).origin;
          detailUrls = [
            ...extractDetailUrls(html, source.detailPattern, baseOrigin),
            ...extractGenericUrls(html),
          ];
        }

        console.log(`${source.name}: found ${detailUrls.length} detail URLs`);
        return {
          source: source.name,
          html,
          text: stripHtml(html).substring(0, 5000),
          detailUrls,
        };
      })
    );

    // Step 2: Collect and deduplicate all detail URLs
    const allDetailUrls = [...new Set(searchResults.flatMap((r) => r.detailUrls))].slice(0, 25);
    console.log(`Total unique detail URLs: ${allDetailUrls.length}`);

    // Step 3: Fetch detail pages in batches of 5
    const detailTexts: string[] = [];
    for (let i = 0; i < allDetailUrls.length; i += 5) {
      const batch = allDetailUrls.slice(i, i + 5);
      const results = await Promise.all(
        batch.map(async (dUrl) => {
          const html = await fetchPage(dUrl);
          if (!html) return "";
          const phones = extractPhoneNumbers(html);
          const emails = extractEmails(html);
          const phoneInfo = phones.length > 0 ? `\nEXTRACTED PHONE NUMBERS: ${phones.join(", ")}` : "";
          const emailInfo = emails.length > 0 ? `\nEXTRACTED EMAILS: ${emails.join(", ")}` : "";
          const text = stripHtml(html).substring(0, 3000);
          return `--- DETAIL PAGE: ${dUrl} ---${phoneInfo}${emailInfo}\n${text}`;
        })
      );
      detailTexts.push(...results.filter(Boolean));
    }

    // Also extract phones/emails from the search result pages themselves
    for (const sr of searchResults) {
      if (sr.html) {
        const phones = extractPhoneNumbers(sr.html);
        const emails = extractEmails(sr.html);
        if (phones.length > 0 || emails.length > 0) {
          const phoneInfo = phones.length > 0 ? `\nEXTRACTED PHONE NUMBERS FROM LISTING: ${phones.join(", ")}` : "";
          const emailInfo = emails.length > 0 ? `\nEXTRACTED EMAILS FROM LISTING: ${emails.join(", ")}` : "";
          // Prepend to the source text
          sr.text = `${phoneInfo}${emailInfo}\n${sr.text}`;
        }
      }
    }

    // Combine all text
    const searchTexts = searchResults
      .filter((r) => r.text)
      .map((r) => `--- SOURCE: ${r.source} ---\n${r.text}`)
      .join("\n\n");

    const rawText = (searchTexts + "\n\n" + detailTexts.join("\n\n")).substring(0, 40000);

    if (rawText.trim().length < 100) {
      return new Response(
        JSON.stringify({
          success: true,
          leads: [],
          sources_searched: SEARCH_SOURCES.map((s) => s.name),
          detail_pages_fetched: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: AI extraction & scoring
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a data extraction AI for Conlink, a construction-industry CRM in Ethiopia.
Given search results from multiple Ethiopian web sources, extract ALL business leads (companies) you can find.

SEARCH QUERY: "${searchQuery}"

IMPORTANT EXTRACTION RULES:
1. Extract EVERY company/business mentioned in the text, even if only a name and partial info is available.
2. Look for company names in directory listings, article mentions, search result snippets, etc.
3. For each company, try to find: name, phone, email, address, what they do.

PHONE NUMBER RULES:
1. Lines with "EXTRACTED PHONE NUMBERS" are the MOST RELIABLE source — always use these first.
2. Ethiopian numbers: +251 9XX XXX XXX or 09XX XXX XXX format. 10 digits with 0 prefix.
3. If phone appears truncated or incomplete, still include it — partial info is better than none.
4. The general 2merkato number (+251-93-010-5437) is NOT a company phone — ignore it.

EMAIL RULES:
1. Lines with "EXTRACTED EMAILS" are the MOST RELIABLE source — always use these first.
2. Skip generic emails like info@2merkato.com, noreply@, admin@, support@ of the directory site itself.

CATEGORY MATCHING — Score against these 16 Conlink categories:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

SCORING (relevance_score 1-100):
- Category match quality (40%)
- Search query relevance (30%)  
- Contact info completeness (30%)

PRIORITY: high >= 60, medium 30-59, low < 30

CRITICAL: You MUST return at least the companies you find even if phone/email is missing. Set phone/email to "" if not found. The filtering will happen after.`;

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
          { role: "user", content: `Extract business leads from these Ethiopian web search results:\n\n${rawText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_leads",
              description: "Extract business leads from search results",
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

    console.log(`AI extracted ${leads.length} raw leads before filtering`);

    const normalizedLeads = leads
      .map((l: any) => ({
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
      }))
      .filter((l: any) => l.company_name.trim() !== "")
      // Only keep leads that have at least a phone or email
      .filter((l: any) => l.phone.trim() !== "" || l.email.trim() !== "");

    console.log(`Search "${searchQuery}" → ${normalizedLeads.length} leads (after filter) from ${SEARCH_SOURCES.length} sources, ${allDetailUrls.length} detail pages`);

    return new Response(
      JSON.stringify({
        success: true,
        leads: normalizedLeads,
        sources_searched: SEARCH_SOURCES.map((s) => s.name),
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
