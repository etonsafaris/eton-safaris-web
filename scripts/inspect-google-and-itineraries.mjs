/**
 * Quick DB check for robots_index + missing tour itineraries.
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

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function itineraryDayCount(row) {
  const fromCol = parseJson(row.itineraries);
  if (Array.isArray(fromCol) && fromCol.length) return fromCol.length;
  const html = String(row.description || row.content || '');
  const m = html.match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (!m) return 0;
  try {
    const raw = decodeURIComponent(m[1]);
    const emb = JSON.parse(raw);
    return Array.isArray(emb?.itineraries) ? emb.itineraries.length : 0;
  } catch {
    try {
      const emb = JSON.parse(m[1]);
      return Array.isArray(emb?.itineraries) ? emb.itineraries.length : 0;
    } catch {
      return 0;
    }
  }
}

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

for (const table of tables) {
  const { data, error } = await sb.from(table).select('id,robots_index,seo_settings').limit(1000);
  if (error) {
    console.log(table, 'ERR', error.message);
    continue;
  }
  let on = 0;
  let off = 0;
  let nullish = 0;
  let packedOn = 0;
  for (const row of data || []) {
    if (row.robots_index === true) on += 1;
    else if (row.robots_index === false) off += 1;
    else nullish += 1;
    const s = parseJson(row.seo_settings);
    if (s?.robots_index === true) packedOn += 1;
  }
  console.log(`${table}: sample=${(data || []).length} colOn=${on} colOff=${off} colNull=${nullish} packedOn=${packedOn}`);
}

const { data: tours, error: tourErr } = await sb
  .from('tours')
  .select('id,title,country,category,duration_days,duration_nights,duration_label,itineraries,description,content')
  .limit(2000);
if (tourErr) {
  console.log('tours itinerary fetch ERR', tourErr.message);
  // retry without itineraries column
  const retry = await sb
    .from('tours')
    .select('id,title,country,category,duration_days,duration_nights,duration_label,description,content')
    .limit(2000);
  console.log('retry', retry.error?.message, 'rows', (retry.data || []).length);
  var tourRows = retry.data || [];
} else {
  var tourRows = tours || [];
}

const missing = [];
const byCountry = {};
for (const row of tourRows) {
  const days = itineraryDayCount(row);
  const country = String(row.country || 'Unknown').trim() || 'Unknown';
  byCountry[country] = byCountry[country] || { total: 0, missing: 0 };
  byCountry[country].total += 1;
  if (days === 0) {
    byCountry[country].missing += 1;
    missing.push({
      id: row.id,
      title: String(row.title || '').slice(0, 60),
      country,
      category: row.category,
      duration_days: row.duration_days,
      duration_label: row.duration_label,
    });
  }
}
console.log('\nMissing itineraries:', missing.length, '/', tourRows.length);
console.log(JSON.stringify(byCountry, null, 2));
console.log('Sample missing:', JSON.stringify(missing.slice(0, 25), null, 2));
