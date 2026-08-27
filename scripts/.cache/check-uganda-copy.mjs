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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await sb.from('countries').select('name,description').ilike('name', 'Uganda').limit(1);
if (error) {
  console.error(error.message);
  process.exit(1);
}
const html = String(data?.[0]?.description || '');
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
console.log(
  JSON.stringify(
    {
      hasDirectory: /National Parks in Uganda/i.test(html),
      parkLinks: (html.match(/\/parks\//g) || []).length,
      chars: text.length,
      snippet: text.slice(0, 280),
    },
    null,
    2
  )
);
