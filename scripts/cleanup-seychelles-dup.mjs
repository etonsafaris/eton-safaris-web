/**
 * Remove duplicate Seychelles Vallee de Mai (accented vs ASCII names).
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

const { data, error } = await sb.from('national_park').select('id,name,seo_slug').eq('country', 'Seychelles');
if (error) throw error;
console.log('Seychelles parks:', data);

const accented = (data || []).find((row) => /vall/i.test(row.name) && /é|è|ê/i.test(row.name));
const ascii = (data || []).find((row) => /^vallee de mai/i.test(row.name));
if (accented && ascii && accented.id !== ascii.id) {
  const { error: delError } = await sb.from('national_park').delete().eq('id', accented.id);
  if (delError) throw delError;
  console.log('Deleted duplicate:', accented.name, accented.id);
} else {
  console.log('No accented duplicate to remove', { accented, ascii });
}
