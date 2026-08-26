/**
 * Delete fictional generated accommodations using name pattern queries (no full table scan).
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

const STYLES = [
  'River',
  'Savannah',
  'Forest',
  'Hilltop',
  'Horizon',
  'Baobab',
  'Mist',
  'Sunset',
  'Valley',
  'Lagoon',
  'Canyon',
  'Plateau',
  'Oasis',
  'Crest',
  'Trail',
];
const TIERS = ['Luxury', 'Safari'];
const NOUNS = ['Lodge', 'Camp', 'Hotel', 'Bandas'];
const FAKE_RE =
  /\b(River|Savannah|Forest|Hilltop|Horizon|Baobab|Mist|Sunset|Valley|Lagoon|Canyon|Plateau|Oasis|Crest|Trail)\s+(Luxury|Safari)\s+(Lodge|Camp|Hotel|Bandas)\b/i;

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const found = new Map();

function isTransient(message) {
  return /timeout|fetch failed|520|502|503|504|schema cache|PGRST002|Could not query the database/i.test(
    String(message || '')
  );
}

async function searchPattern(pattern) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await sb.from('accommodations').select('id,name').ilike('name', pattern).limit(1000);
    if (!error) return data || [];
    if (!isTransient(error.message || error.code)) throw error;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return [];
}

for (const style of STYLES) {
  for (const tier of TIERS) {
    for (const noun of NOUNS) {
      const pattern = `%${style}%${tier}%${noun}%`;
      const rows = await searchPattern(pattern);
      for (const row of rows) {
        if (FAKE_RE.test(String(row.name || ''))) found.set(row.id, row.name);
      }
    }
  }
}

// Also catch Stay Overview / Inside|Edge of|Near location leftovers with style-less names
const locPatterns = ['Inside %', 'Edge of %', 'Near %'];
for (const pattern of locPatterns) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await sb
      .from('accommodations')
      .select('id,name,location,description_title')
      .ilike('location', pattern)
      .eq('description_title', 'Stay Overview')
      .limit(1000);
    if (!error) {
      for (const row of data || []) {
        if (FAKE_RE.test(String(row.name || '')) || /Stay Overview/.test(String(row.description_title || ''))) {
          // Only delete if name looks generated OR clearly from our seed naming
          if (FAKE_RE.test(String(row.name || ''))) found.set(row.id, row.name);
        }
      }
      break;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
}

console.log(JSON.stringify({ fakeCount: found.size, dryRun, sample: [...found.values()].slice(0, 15) }, null, 2));

if (dryRun) process.exit(0);

let deleted = 0;
const ids = [...found.keys()];
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  const { error } = await sb.from('accommodations').delete().in('id', chunk);
  if (error) console.warn('chunk delete failed', error.message);
  else deleted += chunk.length;
  console.log(`Deleted ${deleted}/${ids.length}`);
}
console.log(JSON.stringify({ deleted }, null, 2));
