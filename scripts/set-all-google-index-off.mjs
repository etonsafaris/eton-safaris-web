/**
 * Persist Google indexing OFF for all content via seo_schema._etonSeo
 * (robots_index / seo_settings columns do not exist on these tables).
 *
 * Usage:
 *   node scripts/set-all-google-index-off.mjs --dry-run
 *   node scripts/set-all-google-index-off.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const TABLES = [
  'tours',
  'accommodations',
  'national_park',
  'countries',
  'categories',
  'pages',
  'explore',
  'safari_updates',
  'landing_pages',
];

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

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function schemaWithRobots(seoSchema, enabled) {
  let parsed = parseJson(seoSchema);
  if (!parsed || typeof parsed !== 'object') {
    parsed = { '@context': 'https://schema.org', '@type': 'WebPage' };
  }
  const eton = parsed._etonSeo && typeof parsed._etonSeo === 'object' ? { ...parsed._etonSeo } : {};
  eton.robots_index = enabled;
  eton.robots_follow = eton.robots_follow !== false;
  return JSON.stringify({ ...parsed, _etonSeo: eton });
}

function currentRobots(seoSchema) {
  const parsed = parseJson(seoSchema);
  const value = parsed?._etonSeo?.robots_index;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

async function fetchAll(supabase, table, columns) {
  const pageSize = 500;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const summary = [];

for (const table of TABLES) {
  let rows;
  try {
    rows = await fetchAll(supabase, table, 'id,seo_schema');
  } catch (error) {
    console.log(`skip ${table}: ${error.message}`);
    continue;
  }

  let wereOn = 0;
  let wereOff = 0;
  let unset = 0;
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const current = currentRobots(row.seo_schema);
    if (current === true) wereOn += 1;
    else if (current === false) wereOff += 1;
    else unset += 1;

    if (current === false) continue;

    const nextSchema = schemaWithRobots(row.seo_schema, false);
    if (dryRun) {
      updated += 1;
      continue;
    }

    const payload = { seo_schema: nextSchema };
    if (table === 'tours' || table === 'accommodations' || table === 'national_park') {
      payload.updated_date = new Date().toISOString();
    }

    let ok = false;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { error } = await supabase.from(table).update(payload).eq('id', row.id);
      if (!error) {
        ok = true;
        break;
      }
      if (/updated_date|Could not find the '/i.test(error.message || '') && 'updated_date' in payload) {
        delete payload.updated_date;
        continue;
      }
      if (/520|502|503|504|fetch failed|timeout/i.test(error.message || '') && attempt < 4) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      console.error(`  ${table} ${row.id}: ${error.message}`);
      break;
    }
    if (ok) updated += 1;
    else failed += 1;
  }

  summary.push({ table, total: rows.length, wereOn, wereOff, unset, updated, failed, dryRun });
  console.log(
    `${table}: total=${rows.length} on=${wereOn} off=${wereOff} unset=${unset} → setOff=${updated}${failed ? ` fail=${failed}` : ''}`
  );
}

console.table(summary);
if (dryRun) console.log('(dry-run — re-run without --dry-run to apply)');
