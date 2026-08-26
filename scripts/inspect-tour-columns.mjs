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

const { data, error } = await sb.from('tours').select('*').limit(1).maybeSingle();
if (error) throw error;
console.log(Object.keys(data || {}).sort().join('\n'));
console.log('--- sample ---');
const keep = [
  'title',
  'slug',
  'seo_title',
  'meta_description',
  'focus_keyword',
  'focus_keyphrase',
  'focus_keywords',
  'social_image_url',
  'seo_schema',
  'image_url',
];
const sample = {};
for (const key of keep) sample[key] = data?.[key];
console.log(JSON.stringify(sample, null, 2));
