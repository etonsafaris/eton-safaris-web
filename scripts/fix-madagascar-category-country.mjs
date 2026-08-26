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

const { data, error } = await sb.from('categories').select('id,name,country,slug');
if (error) throw error;
const bad = (data || []).filter((row) => String(row.country || '') !== String(row.country || '').trim());
console.log('Categories with untrimmed country:', bad);

for (const row of bad) {
  const trimmedCountry = String(row.country || '').trim();
  const duplicate = (data || []).find(
    (other) =>
      other.id !== row.id &&
      String(other.country || '').trim() === trimmedCountry &&
      String(other.name || '').trim() === String(row.name || '').trim()
  );
  if (duplicate) {
    const { count } = await sb
      .from('tours')
      .select('id', { count: 'exact', head: true })
      .eq('country', row.country)
      .eq('category', row.name);
    console.log(`Deleting empty/duplicate category ${row.id} (${row.country}/${row.name}), tours=${count}`);
    if (!count) {
      const { error: delError } = await sb.from('categories').delete().eq('id', row.id);
      if (delError) console.warn(delError.message);
    }
  } else {
    const { error: updError } = await sb.from('categories').update({ country: trimmedCountry }).eq('id', row.id);
    console.log(`Trimmed country on ${row.id}`, updError?.message || 'ok');
  }
}
