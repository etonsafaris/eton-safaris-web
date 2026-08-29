import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const file = resolve(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

function parseEmbedded(description) {
  const match = String(description || '').match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
}

function robotsFromSchema(seoSchema) {
  try {
    const parsed = typeof seoSchema === 'string' ? JSON.parse(seoSchema) : seoSchema;
    return parsed?._etonSeo?.robots_index;
  } catch {
    return undefined;
  }
}

const { data: sample, error } = await sb
  .from('tours')
  .select('id,title,country,category,duration_days,duration_nights,duration_label,itinerary,seo_schema,description,seo_title')
  .limit(8);
if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    (sample || []).map((r) => {
      const emb = parseEmbedded(r.description);
      const days = Array.isArray(emb?.itineraries) ? emb.itineraries.length : 0;
      return {
        id: r.id,
        title: String(r.title || '').slice(0, 60),
        country: r.country,
        duration_days: r.duration_days,
        itinerary_col_len: String(r.itinerary || '').length,
        embed_days: days,
        robots: robotsFromSchema(r.seo_schema),
        has_etonSeo: String(r.seo_schema || '').includes('_etonSeo'),
      };
    }),
    null,
    2
  )
);

// Count missing itineraries across all tours (paged)
const pageSize = 500;
let from = 0;
let total = 0;
let missing = 0;
let withDays = 0;
const missingByCountry = {};
const missingSamples = [];

while (true) {
  const { data, error: pageErr } = await sb
    .from('tours')
    .select('id,title,country,category,duration_days,duration_label,itinerary,description')
    .range(from, from + pageSize - 1);
  if (pageErr) throw pageErr;
  const rows = data || [];
  if (!rows.length) break;
  for (const r of rows) {
    total += 1;
    const emb = parseEmbedded(r.description);
    const embedDays = Array.isArray(emb?.itineraries) ? emb.itineraries.length : 0;
    const itineraryText = String(r.itinerary || '').trim();
    const has =
      embedDays > 0 ||
      (itineraryText.length > 40 && /day\s*\d/i.test(itineraryText));
    if (has) withDays += 1;
    else {
      missing += 1;
      const c = String(r.country || 'Unknown').trim() || 'Unknown';
      missingByCountry[c] = (missingByCountry[c] || 0) + 1;
      if (missingSamples.length < 25) {
        missingSamples.push({
          id: r.id,
          title: String(r.title || '').slice(0, 70),
          country: c,
          category: r.category,
          duration_days: r.duration_days,
          duration_label: r.duration_label,
        });
      }
    }
  }
  if (rows.length < pageSize) break;
  from += pageSize;
}

console.log(JSON.stringify({ total, withDays, missing, missingByCountry, missingSamples }, null, 2));
