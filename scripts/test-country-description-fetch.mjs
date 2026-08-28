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
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const listCols =
  'id,name,slug,seo_slug,tagline,image_url,social_image_url,is_popular,description_title,created_date,updated_date';
const { data: list, error: listError } = await supabase.from('countries').select(listCols).eq('name', 'Uganda').limit(1);
const { data: full, error: fullError } = await supabase.from('countries').select('*').eq('name', 'Uganda').limit(1);

console.log(
  JSON.stringify(
    {
      listError: listError?.message || null,
      listHasDescription: Boolean(list?.[0]?.description),
      fullError: fullError?.message || null,
      fullDescriptionLength: String(full?.[0]?.description || '').length,
      summaryLength: String(full?.[0]?.summary || '').length,
    },
    null,
    2
  )
);
