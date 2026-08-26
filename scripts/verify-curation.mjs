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

function plain(html) {
  return String(html || '')
    .replace(/<!--ETON_CONTENT:[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

loadEnv();
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const { data: countries } = await sb.from('countries').select('name,description,seo_title,meta_description,focus_keyword');
const { data: categories } = await sb.from('categories').select('name,country,description,seo_title,focus_keyword');
const { data: parks } = await sb.from('national_park').select('name,country,seo_slug');

const ug = countries.find((c) => c.name === 'Uganda');
const na = countries.find((c) => c.name === 'Namibia');
const links = [...String(ug?.description || '').matchAll(/href="(\/parks\/[^"]+)"[^>]*>([^<]+)/gi)].map(
  (m) => ({ href: m[1], text: m[2] })
);

console.log(
  JSON.stringify(
    {
      parkSlugSample: parks.slice(0, 3).map((p) => ({ name: p.name, seo_slug: p.seo_slug })),
      parksMissingSlug: parks.filter((p) => !p.seo_slug).length,
      ugandaLinks: links,
      namibia: {
        descLen: plain(na?.description).length,
        seo_title: na?.seo_title,
        focus: na?.focus_keyword,
        hasParkLink: /\/parks\//.test(na?.description || ''),
      },
      thinCountriesLeft: countries
        .filter((c) => plain(c.description).length < 250)
        .map((c) => `${c.name} (${plain(c.description).length})`),
      thinCatsLeft: categories
        .filter((c) => plain(c.description).length < 200)
        .map((c) => `${c.country}/${c.name} (${plain(c.description).length})`),
      countriesMissingFocus: countries.filter((c) => !c.focus_keyword).map((c) => c.name),
      catsMissingFocus: categories.filter((c) => !c.focus_keyword).length,
    },
    null,
    2
  )
);
