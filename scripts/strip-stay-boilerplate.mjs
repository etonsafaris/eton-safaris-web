/**
 * Remove repeated stay/park boilerplate sentences from live Supabase content.
 *
 * Usage:
 *   node scripts/strip-stay-boilerplate.mjs --dry-run
 *   node scripts/strip-stay-boilerplate.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { hasStayBoilerplate, stripStayBoilerplate } from './lib/stay-content-builders.mjs';

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

async function fetchAll(supabase, table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('id,name,description').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const tables = ['accommodations', 'national_park'];
const summary = { dryRun, updated: {}, failed: [] };

for (const table of tables) {
  const rows = await fetchAll(supabase, table);
  let updated = 0;
  for (const row of rows) {
    const raw = String(row.description || '');
    if (!hasStayBoilerplate(raw)) continue;
    const cleaned = stripStayBoilerplate(raw);
    if (cleaned === raw) continue;
    if (dryRun) {
      updated += 1;
      continue;
    }
    const { error } = await supabase.from(table).update({ description: cleaned }).eq('id', row.id);
    if (error) {
      summary.failed.push({ table, name: row.name, error: error.message });
    } else {
      updated += 1;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  summary.updated[table] = updated;
  console.log(`${table}: stripped boilerplate from ${updated} records`);
}

console.log(JSON.stringify(summary, null, 2));
