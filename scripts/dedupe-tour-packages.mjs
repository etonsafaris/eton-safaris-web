/**
 * Remove exact duplicate tour titles within the same country+category (keeps oldest).
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
const dryRun = process.argv.includes('--dry-run');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function fetchAll(columns) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from('tours')
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

const tours = await fetchAll('id,title,country,category,created_date');
const groups = new Map();
for (const tour of tours) {
  const key = `${tour.country}||${tour.category}||${String(tour.title || '').toLowerCase()}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(tour);
}

const toDelete = [];
for (const list of groups.values()) {
  if (list.length < 2) continue;
  list.sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')));
  // Keep the oldest; delete the rest.
  toDelete.push(...list.slice(1).map((row) => row.id));
}

console.log(`Duplicate rows to delete: ${toDelete.length} (dryRun=${dryRun})`);

if (!dryRun && toDelete.length) {
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 100) {
    const chunk = toDelete.slice(i, i + 100);
    const { error } = await sb.from('tours').delete().in('id', chunk);
    if (error) throw error;
    deleted += chunk.length;
    console.log(`… deleted ${deleted}/${toDelete.length}`);
  }
}

console.log(JSON.stringify({ ok: true, dryRun, deleted: dryRun ? 0 : toDelete.length }, null, 2));
