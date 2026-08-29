/**
 * Discover which SEO / itinerary columns exist on content tables.
 */
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

const tables = [
  'tours',
  'accommodations',
  'national_park',
  'explore',
  'safari_updates',
  'countries',
  'categories',
  'pages',
];

const candidates = [
  'robots_index',
  'robots_follow',
  'seo_settings',
  'seo_schema',
  'canonical_url',
  'meta_description',
  'seo_title',
  'focus_keyphrase',
  'itineraries',
  'itinerary',
  'description',
  'content',
];

for (const table of tables) {
  const { data, error } = await sb.from(table).select('*').limit(1);
  if (error) {
    console.log(table, 'ERR', error.message);
    continue;
  }
  const keys = data?.[0] ? Object.keys(data[0]).sort() : [];
  const present = candidates.filter((c) => keys.includes(c));
  const missing = candidates.filter((c) => !keys.includes(c));
  console.log(`\n=== ${table} (${keys.length} cols) ===`);
  console.log('present:', present.join(', ') || '(none of candidates)');
  console.log('missing:', missing.join(', ') || '(none)');
  if (table === 'tours' && data?.[0]) {
    const row = data[0];
    console.log('sample title:', row.title);
    console.log('has itinerary:', Boolean(row.itinerary), 'len', String(row.itinerary || '').length);
    console.log('desc has ETON_CONTENT:', String(row.description || '').includes('ETON_CONTENT'));
  }
}

// Tour itinerary audit
const pageSize = 200;
let from = 0;
let total = 0;
let missingItin = 0;
const byCountry = {};
const samples = [];

while (true) {
  const { data, error } = await sb
    .from('tours')
    .select('id,title,country,category,duration_days,duration_nights,duration_label,itinerary,description')
    .range(from, from + pageSize - 1);
  if (error) {
    console.log('tour page ERR', error.message);
    break;
  }
  const rows = data || [];
  if (!rows.length) break;
  for (const row of rows) {
    total += 1;
    let days = 0;
    try {
      const parsed = row.itinerary ? JSON.parse(row.itinerary) : null;
      if (Array.isArray(parsed)) days = parsed.length;
      else if (parsed?.days && Array.isArray(parsed.days)) days = parsed.days.length;
    } catch {
      /* ignore */
    }
    if (!days) {
      const html = String(row.description || '');
      const m = html.match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
      if (m) {
        try {
          const emb = JSON.parse(decodeURIComponent(m[1]));
          days = Array.isArray(emb?.itineraries) ? emb.itineraries.length : 0;
        } catch {
          try {
            const emb = JSON.parse(m[1]);
            days = Array.isArray(emb?.itineraries) ? emb.itineraries.length : 0;
          } catch {
            /* ignore */
          }
        }
      }
    }
    const country = String(row.country || 'Unknown').trim() || 'Unknown';
    byCountry[country] = byCountry[country] || { total: 0, missing: 0 };
    byCountry[country].total += 1;
    if (!days) {
      missingItin += 1;
      byCountry[country].missing += 1;
      if (samples.length < 40) {
        samples.push({
          id: row.id,
          title: String(row.title || '').slice(0, 70),
          country,
          category: row.category,
          duration_days: row.duration_days,
          duration_label: row.duration_label,
        });
      }
    }
  }
  if (rows.length < pageSize) break;
  from += pageSize;
}

console.log(`\nTours itinerary audit: missing ${missingItin} / ${total}`);
console.log(JSON.stringify(byCountry, null, 2));
console.log('samples:', JSON.stringify(samples, null, 2));

// seo_settings packed robots check on tours
{
  const { data } = await sb.from('tours').select('id,title,seo_settings,seo_schema').limit(30);
  let packedOn = 0;
  let schemaOn = 0;
  let packedOff = 0;
  let neither = 0;
  for (const row of data || []) {
    let on = null;
    try {
      const s = row.seo_settings ? JSON.parse(row.seo_settings) : null;
      if (s && typeof s.robots_index === 'boolean') on = s.robots_index;
    } catch {
      /* ignore */
    }
    if (on == null) {
      try {
        const schema = row.seo_schema ? JSON.parse(row.seo_schema) : null;
        if (schema?._etonSeo && typeof schema._etonSeo.robots_index === 'boolean') {
          on = schema._etonSeo.robots_index;
        }
      } catch {
        /* ignore */
      }
    }
    if (on === true) packedOn += 1;
    else if (on === false) packedOff += 1;
    else neither += 1;
  }
  console.log(`\ntours seo packed sample30: on=${packedOn} off=${packedOff} unset=${neither}`);
  console.log(
    'sample seo_settings:',
    (data || []).slice(0, 5).map((r) => ({
      id: r.id,
      title: String(r.title || '').slice(0, 40),
      seo_settings: String(r.seo_settings || '').slice(0, 120),
    }))
  );
}
