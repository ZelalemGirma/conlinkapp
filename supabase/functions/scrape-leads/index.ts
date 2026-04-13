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

function extractDetailUrls(html: string, baseOrigin: string): string[] {
  const regex = /href="((?:https?:\/\/[^"]*)?\/directory\/\d+-[^"]+)"/gi;
  const urls = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    let u = match[1];
    if (u.startsWith("/")) u = baseOrigin + u;
    urls.add(u);
  }
  return [...urls];
}

function extractPaginationUrls(html: string, baseUrl: string): string[] {
  // Match pagination links like ?page=2, ?page=3 etc.
  const regex = /href="([^"]*[?&]page=(\d+)[^"]*)"/gi;
  const pages = new Map<number, string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    const pageNum = parseInt(match[2]);
    let u = match[1];
    if (u.startsWith("/")) {
      const urlObj = new URL(baseUrl);
      u = urlObj.origin + u;
    } else if (!u.startsWith("http")) {
      u = baseUrl.replace(/\?.*$/, "") + "?" + u.replace(/^.*\?/, "");
    }
    if (pageNum > 1) pages.set(pageNum, u);
  }
  // Sort by page number and return
  return [...pages.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
}

function extractPhoneNumbers(html: string): string[] {
  // Extract phone numbers from HTML including hidden/data attributes
  // Look for patterns in data attributes, hidden spans, tel: links
  const phones: string[] = [];
  
  // Match tel: links
  const telRegex = /href="tel:([^"]+)"/gi;
  let m;
  while ((m = telRegex.exec(html)) !== null) {
    phones.push(m[1].trim());
  }
  
  // Match data-phone or data-mobile attributes
  const dataRegex = /data-(?:phone|mobile|tel)[=:]"?([^">\s]+)/gi;
  while ((m = dataRegex.exec(html)) !== null) {
    phones.push(m[1].trim());
  }
  
  // Match Ethiopian phone patterns in visible text: +251, 0911, etc.
  const ethRegex = /(?:\+251|0)[\s.-]?(?:9|1[1-9])\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g;
  const stripped = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  while ((m = ethRegex.exec(stripped)) !== null) {
    phones.push(m[0].trim());
  }
  
  return [...new Set(phones)];
}

async function fetchPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
    const { url, maxPages = 3 } = await req.json();
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

    console.log("Fetching URL:", formattedUrl, "maxPages:", maxPages);

    // Step 1: Fetch main listing page
    const mainHtml = await fetchPage(formattedUrl);
    if (!mainHtml) {
      return new Response(JSON.stringify({ error: "Failed to fetch URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urlObj = new URL(formattedUrl);
    const baseOrigin = urlObj.origin;

    // Step 2: Collect detail URLs from page 1
    let allDetailUrls = extractDetailUrls(mainHtml, baseOrigin);
    console.log(`Page 1: found ${allDetailUrls.length} detail URLs`);

    // Step 3: Discover and fetch additional listing pages
    const paginationUrls = extractPaginationUrls(mainHtml, formattedUrl);
    const pagesToFetch = paginationUrls.slice(0, Math.max(0, maxPages - 1));
    console.log(`Found ${paginationUrls.length} pagination links, fetching ${pagesToFetch.length} more pages`);

    for (const pageUrl of pagesToFetch) {
      console.log(`Fetching listing page: ${pageUrl}`);
      const pageHtml = await fetchPage(pageUrl);
      if (pageHtml) {
        const pageDetailUrls = extractDetailUrls(pageHtml, baseOrigin);
        console.log(`Found ${pageDetailUrls.length} detail URLs on this page`);
        allDetailUrls = [...allDetailUrls, ...pageDetailUrls];
      }
    }

    // Deduplicate detail URLs
    allDetailUrls = [...new Set(allDetailUrls)];
    console.log(`Total unique detail URLs: ${allDetailUrls.length}`);

    // Step 4: Fetch each detail page (batches of 5) and extract phones from raw HTML
    let combinedText = "";
    const detailTexts: string[] = [];

    if (allDetailUrls.length > 0) {
      for (let i = 0; i < allDetailUrls.length; i += 5) {
        const batch = allDetailUrls.slice(i, i + 5);
        const results = await Promise.all(batch.map(async (dUrl) => {
          const html = await fetchPage(dUrl);
          if (!html) return "";
          
          // Extract phone numbers directly from HTML before stripping
          const phones = extractPhoneNumbers(html);
          const phoneInfo = phones.length > 0 
            ? `\nEXTRACTED PHONE NUMBERS: ${phones.join(", ")}` 
            : "";
          
          return `--- DETAIL PAGE: ${dUrl} ---${phoneInfo}\n${stripHtml(html)}`;
        }));
        detailTexts.push(...results.filter(Boolean));
      }
      combinedText = stripHtml(mainHtml) + "\n\n" + detailTexts.join("\n\n");
    } else {
      combinedText = stripHtml(mainHtml);
    }

    const rawText = combinedText.substring(0, 30000);

    // Step 5: AI extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a data extraction AI for a construction industry CRM called Conlink. 
Given raw website text (which may include multiple detail pages from MULTIPLE LISTING PAGES), extract ALL potential business leads (companies) you can find.

IMPORTANT RULES FOR PHONE NUMBERS:
1. The text includes "EXTRACTED PHONE NUMBERS:" lines for each detail page - these are the MOST RELIABLE source for phone numbers. ALWAYS use these over any truncated numbers in the text.
2. Ethiopian numbers must have 9-10 digits after +251 (e.g., +251 911 234 567). If only a truncated number is available (ending in "..." or "000" or incomplete), set to empty "".
3. NEVER guess or fabricate missing digits. If you cannot find the complete phone number, leave it empty.
4. If a number appears as "0911 23 45 67", convert to "+251 911 234 567" format.

For each company found, extract:
- company_name: The company's legal/trade name
- primary_phone: Main phone/mobile number (MUST be complete, no guessing)
- secondary_phone: Alternative phone if available (same rules)
- email: Business email
- address: Full physical address from the detail page
- location_zone: District/area name (e.g., Bole, Kirkos, Yeka, Nifas Silk for Addis Ababa)
- category: Best match from these 16 categories: ${CATEGORIES.join(", ")}
- relevance_score: 1-100 score of how well the company fits the construction industry
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

    const normalizedLeads = leads
      .map((l: any) => ({
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
      }))
      // Only keep leads that have at least a phone or email
      .filter((l: any) => l.phone.trim() !== "" || l.email.trim() !== "");

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
        ai_reasoning: "No leads with phone or email could be extracted from this page.",
        priority: "low",
      });
    }

    console.log(`Extracted ${normalizedLeads.length} leads from ${allDetailUrls.length} detail pages across ${1 + pagesToFetch.length} listing pages`);

    return new Response(JSON.stringify({
      success: true,
      leads: normalizedLeads,
      raw_text: rawText.substring(0, 5000),
      detail_pages_fetched: allDetailUrls.length,
      listing_pages_fetched: 1 + pagesToFetch.length,
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
