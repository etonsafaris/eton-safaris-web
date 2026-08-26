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

const [categories, tours] = await Promise.all([
  fetchAll('categories', 'country,name'),
  fetchAll('tours', 'country,category'),
]);

const byCat = new Map();
for (const cat of categories) {
  const key = `${cat.country}||${cat.name}`;
  byCat.set(key, { country: cat.country, category: cat.name, count: 0 });
}
for (const tour of tours) {
  const key = `${tour.country}||${tour.category}`;
  if (!byCat.has(key)) byCat.set(key, { country: tour.country, category: tour.category, count: 0 });
  byCat.get(key).count += 1;
}

const rows = [...byCat.values()].sort((a, b) =>
  a.country === b.country ? a.category.localeCompare(b.category) : a.country.localeCompare(b.country)
);
console.log(JSON.stringify({ totalTours: tours.length, categories: rows }, null, 2));
