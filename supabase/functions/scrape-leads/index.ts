import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Building Materials": ["cement", "concrete", "brick", "block", "sand", "gravel", "aggregate", "rebar", "steel bar", "building material", "construction material", "tile", "marble", "granite", "gypsum", "plaster", "paint", "roofing", "insulation", "waterproof"],
  "Electrical & Power": ["electrical", "power", "generator", "transformer", "switchgear", "cable", "wire", "lighting", "solar panel", "inverter", "ups", "voltage", "circuit", "breaker", "meter", "energy"],
  "Electro Mechanical": ["electromechanical", "electro-mechanical", "hvac", "elevator", "lift", "escalator", "plumbing", "fire fighting", "fire alarm", "bms", "building management"],
  "Conveying Systems": ["conveyor", "conveying", "belt", "material handling", "logistics", "elevator", "escalator", "moving walkway"],
  "Solar Technology": ["solar", "photovoltaic", "pv", "renewable energy", "green energy", "solar panel", "solar water"],
  "Specialities": ["specialty", "speciality", "chemical", "adhesive", "sealant", "epoxy", "coating", "waterproofing"],
  "Metal & Industrial Engineering": ["metal", "steel", "iron", "aluminum", "aluminium", "fabrication", "welding", "machining", "industrial", "engineering", "manufacturing"],
  "Pre-Engineered System": ["pre-engineered", "prefab", "prefabricated", "modular", "steel structure", "metal building"],
  "Road Construction Materials": ["road", "asphalt", "bitumen", "highway", "pavement", "traffic", "road construction"],
  "Geological Systems": ["geological", "geotechnical", "soil", "foundation", "piling", "drilling", "borehole", "ground"],
  "Construction Machinery": ["machinery", "excavator", "loader", "crane", "bulldozer", "forklift", "truck", "mixer", "compactor", "equipment", "heavy equipment", "caterpillar", "jcb"],
  "Land and Building Development": ["real estate", "property", "developer", "development", "housing", "apartment", "condominium", "building development", "land"],
  "Consultants": ["consultant", "consulting", "advisory", "engineering consultant", "project management", "supervision", "design consultant"],
  "Construction Firms": ["contractor", "construction company", "construction firm", "general contractor", "civil works", "builder", "construction"],
  "Interior Design & Architecture": ["interior", "architecture", "architect", "design", "furniture", "decoration", "fit-out", "fitout", "landscape"],
  "Financial Service": ["finance", "financial", "bank", "insurance", "loan", "mortgage", "investment", "leasing"],
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  let bestCategory = "";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches) score += matches.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function extractPhones(text: string): string[] {
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,6}/g;
  const matches = text.match(phoneRegex) || [];
  return [...new Set(matches.map(p => p.replace(/\s+/g, " ").trim()).filter(p => p.replace(/\D/g, "").length >= 7))];
}

function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(emailRegex) || [])];
}

function extractCompanyNames(text: string): string[] {
  // Look for patterns like "Company Name PLC", "XYZ Trading", etc.
  const patterns = [
    /([A-Z][A-Za-z\s&]+(?:PLC|LLC|Ltd|Inc|Corp|Co\.|Trading|Engineering|Construction|Group|Enterprise|Enterprises|Company|Business))/g,
  ];
  const names: string[] = [];
  for (const pat of patterns) {
    const matches = text.match(pat) || [];
    names.push(...matches.map(n => n.trim()));
  }
  return [...new Set(names)].slice(0, 20);
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

    const response = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ConlinkBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch URL: ${response.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await response.text();

    // Strip HTML tags to get text
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    const phones = extractPhones(textContent);
    const emails = extractEmails(textContent);
    const companies = extractCompanyNames(html + " " + textContent);
    const category = detectCategory(textContent);

    // Build lead entries - one per company found, or one generic if none found
    const leads = [];
    if (companies.length > 0) {
      for (const company of companies.slice(0, 10)) {
        leads.push({
          company_name: company,
          phone: phones[0] || "",
          email: emails[0] || "",
          address: "",
          category,
          contact_person: "",
        });
      }
    } else if (phones.length > 0 || emails.length > 0) {
      // Create entries per phone number
      for (let i = 0; i < Math.max(phones.length, 1); i++) {
        leads.push({
          company_name: "",
          phone: phones[i] || "",
          email: emails[i] || emails[0] || "",
          address: "",
          category,
          contact_person: "",
        });
      }
    }

    if (leads.length === 0) {
      leads.push({
        company_name: "",
        phone: "",
        email: "",
        address: "",
        category,
        contact_person: "",
      });
    }

    return new Response(JSON.stringify({
      success: true,
      leads,
      raw_text: textContent.substring(0, 5000),
      detected_category: category,
      all_phones: phones,
      all_emails: emails,
      all_companies: companies,
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
