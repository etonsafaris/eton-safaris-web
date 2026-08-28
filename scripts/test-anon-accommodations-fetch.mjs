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
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, anon, { auth: { persistSession: false } });

const columns =
  'id,name,seo_slug,location,country,type,image_url,social_image_url,description_title,national_park_id,national_park_name,created_date,updated_date';

const tests = [
  () => supabase.from('accommodations').select(columns).range(0, 47).order('created_date', { ascending: false }),
  () => supabase.from('accommodations').select(columns).range(0, 47),
  () => supabase.from('accommodations').select('id,name,image_url').range(0, 47),
];

for (let i = 0; i < tests.length; i += 1) {
  const { data, error, count } = await tests[i]();
  console.log(`test ${i + 1}:`, {
    error: error?.message || null,
    rows: data?.length || 0,
    sample: data?.[0]?.name,
    image: String(data?.[0]?.image_url || '').slice(0, 80),
  });
}

const { count, error: countError } = await supabase
  .from('accommodations')
  .select('id', { count: 'exact', head: true });
console.log('count:', { count, countError: countError?.message || null });
