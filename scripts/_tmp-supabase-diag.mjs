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
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const sb = createClient(url, key, { auth: { persistSession: false } });

const TOUR_LIST =
  'id,title,slug,seo_slug,country,category,duration_days,duration_nights,duration_label,price,image_url,social_image_url,is_featured,is_popular,show_on_landing,star_rating,review_count,created_date,updated_date';
const COUNTRY_LIST = 'id,name,slug,seo_slug,tagline,image_url,social_image_url,is_popular,description_title,created_date,updated_date';

const tests = {};
for (const [name, table, cols] of [
  ['count_countries', 'countries', null],
  ['count_tours', 'tours', null],
  ['light_countries', 'countries', COUNTRY_LIST],
  ['light_tours', 'tours', TOUR_LIST],
  ['full_tours_page1', 'tours', '*'],
]) {
  const t0 = Date.now();
  try {
    if (!cols) {
      const { count, error } = await sb.from(table).select('id', { count: 'exact', head: true });
      tests[name] = { ok: !error, count, ms: Date.now() - t0, err: error?.message || null };
    } else {
      const { data, error } = await sb.from(table).select(cols).range(0, cols === '*' ? 49 : 999);
      tests[name] = {
        ok: !error,
        rows: data?.length || 0,
        kb: data ? Math.round(JSON.stringify(data).length / 1024) : 0,
        ms: Date.now() - t0,
        err: error?.message || null,
      };
    }
  } catch (e) {
    tests[name] = { ok: false, ms: Date.now() - t0, throw: e instanceof Error ? e.message : String(e) };
  }
}
console.log(JSON.stringify(tests, null, 2));
