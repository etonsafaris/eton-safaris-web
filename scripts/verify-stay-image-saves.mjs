import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fingerprintFromUrl } from './lib/image-assign.mjs';

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
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: stays, error } = await supabase
  .from('accommodations')
  .select('id,name,country,image_url,updated_date')
  .eq('country', 'Uganda')
  .order('updated_date', { ascending: false })
  .limit(8);

if (error) {
  console.error('Query failed:', error.message);
  process.exit(1);
}

const groups = new Map();
for (const stay of stays || []) {
  const fp = fingerprintFromUrl(stay.image_url || '');
  groups.set(fp, (groups.get(fp) || 0) + 1);
}

console.log(
  JSON.stringify(
    {
      supabaseUrl: url,
      usingServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      recentlyUpdatedUganda: (stays || []).map((stay) => ({
        name: stay.name,
        updated_date: stay.updated_date,
        image_url: String(stay.image_url || '').slice(0, 120),
        fingerprint: fingerprintFromUrl(stay.image_url || ''),
      })),
      uniqueFingerprintsInSample: groups.size,
    },
    null,
    2
  )
);
