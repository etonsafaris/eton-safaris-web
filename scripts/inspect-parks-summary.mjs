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

const { data: parks } = await sb.from('national_park').select('country,name,description_title,image_url,description');
const by = {};
for (const p of parks || []) by[p.country] = (by[p.country] || 0) + 1;
const sample = parks?.find((p) => /Murchison/i.test(p.name)) || parks?.[1];
const desc = String(sample?.description || '');
const linkCount = (desc.match(/href="\/tours\//g) || []).length;
console.log(
  JSON.stringify(
    {
      total: parks?.length,
      byCountry: by,
      withImage: (parks || []).filter((p) => String(p.image_url || '').trim()).length,
      sample: {
        name: sample?.name,
        title: sample?.description_title,
        linkCount,
        hasImage: Boolean(String(sample?.image_url || '').trim()),
      },
    },
    null,
    2
  )
);
