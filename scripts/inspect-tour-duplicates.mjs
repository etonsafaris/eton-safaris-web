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

async function fetchAll(table, columns) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

const tours = await fetchAll('tours', 'id,title,slug,country,category,duration_days,created_date');
const byKey = new Map();
for (const tour of tours) {
  const key = `${tour.country}||${tour.category}`;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(tour);
}

const report = [];
for (const [key, list] of byKey) {
  const titleCounts = new Map();
  for (const t of list) {
    const title = String(t.title || '').toLowerCase();
    titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
  }
  const dupTitles = [...titleCounts.entries()].filter(([, n]) => n > 1).length;
  const byDays = {};
  for (const t of list) {
    const d = String(t.duration_days || 0);
    byDays[d] = (byDays[d] || 0) + 1;
  }
  report.push({
    key,
    count: list.length,
    dupTitles,
    byDays,
  });
}

report.sort((a, b) => b.count - a.count);
console.log(JSON.stringify(report.filter((r) => r.count !== 100 || r.dupTitles > 0), null, 2));
