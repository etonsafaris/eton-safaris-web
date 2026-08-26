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

const { data, error } = await sb
  .from('categories')
  .select('id,name,country,slug')
  .eq('country', 'Madagascar')
  .eq('name', 'Madagascar Tour Safaris');
if (error) throw error;
console.log(JSON.stringify(data, null, 2));

if ((data || []).length > 1) {
  for (const row of data) {
    const { count } = await sb
      .from('tours')
      .select('id', { count: 'exact', head: true })
      .eq('country', row.country)
      .eq('category', row.name);
    console.log(row.id, 'tours linked by name/country string:', count);
  }
  // Delete the newer empty duplicate category row if it has a distinct id
  const sorted = [...data].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const keep = sorted[0];
  for (const row of sorted.slice(1)) {
    const { error: delError } = await sb.from('categories').delete().eq('id', row.id);
    console.log('Deleted duplicate category', row.id, delError?.message || 'ok', '(kept', keep.id + ')');
  }
}
