import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { allParkEntries, PARKS_BY_COUNTRY } from './lib/national-parks-catalog.mjs';

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

const { data: parks } = await sb.from('national_park').select('name,country,seo_slug');
const by = {};
for (const p of parks || []) {
  const c = String(p.country || '').trim();
  by[c] = (by[c] || 0) + 1;
}

const { data: ugRows } = await sb.from('countries').select('description').ilike('name', 'Uganda').limit(1);
const ugHtml = String(ugRows?.[0]?.description || '');
const links = [...ugHtml.matchAll(/href="(\/parks\/[^"]+)"/g)].map((m) => m[1]);
const hasDirectory = /National Parks in Uganda/i.test(ugHtml);

const missing = [];
for (const { country, park } of allParkEntries()) {
  const found = (parks || []).some(
    (row) =>
      String(row.country || '').trim().toLowerCase() === country.toLowerCase() &&
      String(row.name || '').trim().toLowerCase() === park.name.toLowerCase()
  );
  if (!found) missing.push(`${country} / ${park.name}`);
}

console.log(
  JSON.stringify(
    {
      dbParks: (parks || []).length,
      catalog: allParkEntries().length,
      catalogCounts: Object.fromEntries(Object.entries(PARKS_BY_COUNTRY).map(([k, v]) => [k, v.length])),
      byCountry: by,
      ugandaParkLinks: links.length,
      ugandaHasDirectory: hasDirectory,
      missingSeoSlug: (parks || []).filter((p) => !p.seo_slug).length,
      missingFromDb: missing,
    },
    null,
    2
  )
);
