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
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log({
  hasUrl: Boolean(url),
  urlHost: url ? new URL(url).host : null,
  hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  keyLen: key ? key.length : 0,
});

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error, status, statusText, count } = await sb
  .from('accommodations')
  .select('id,name', { count: 'exact' })
  .limit(3);
console.log(JSON.stringify({ status, statusText, count, data, error }, null, 2));
