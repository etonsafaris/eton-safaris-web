/**
 * Dump sample country/category HTML for curation reference.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
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
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const { data: countries } = await supabase.from('countries').select('*');
const { data: categories } = await supabase.from('categories').select('*');

const outDir = resolve(process.cwd(), 'scripts', '.cache', 'copy-samples');
mkdirSync(outDir, { recursive: true });

for (const name of ['Uganda', 'Kenya', 'Botswana', 'Namibia', 'Zimbabwe', 'Morocco']) {
  const row = (countries || []).find((c) => String(c.name).toLowerCase() === name.toLowerCase());
  if (!row) continue;
  writeFileSync(
    resolve(outDir, `country-${name.toLowerCase().replace(/\s+/g, '-')}.html`),
    String(row.description || '')
  );
  writeFileSync(
    resolve(outDir, `country-${name.toLowerCase().replace(/\s+/g, '-')}-seo.json`),
    JSON.stringify(
      {
        seo_title: row.seo_title,
        meta_description: row.meta_description,
        focus_keyword: row.focus_keyword || row.focus_keyphrase,
        focus_keywords: row.focus_keywords,
        slug: row.slug,
        seo_schema: row.seo_schema,
        social_image_url: row.social_image_url,
        tagline: row.tagline,
        summary: row.summary,
      },
      null,
      2
    )
  );
}

const catSamples = (categories || [])
  .slice()
  .sort((a, b) => String(b.description || '').length - String(a.description || '').length)
  .slice(0, 3);
for (const row of catSamples) {
  const safe = String(row.name || 'cat').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  writeFileSync(resolve(outDir, `category-rich-${safe}.html`), String(row.description || ''));
}
const thinCats = (categories || [])
  .slice()
  .sort((a, b) => String(a.description || '').length - String(b.description || '').length)
  .slice(0, 5);
for (const row of thinCats) {
  const safe = String(row.name || 'cat').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  writeFileSync(
    resolve(outDir, `category-thin-${safe}.json`),
    JSON.stringify(
      {
        name: row.name,
        country: row.country,
        desc: row.description,
        seo_title: row.seo_title,
        meta_description: row.meta_description,
        focus_keyword: row.focus_keyword || row.focus_keyphrase,
      },
      null,
      2
    )
  );
}

console.log(
  JSON.stringify(
    {
      outDir,
      countries: (countries || []).map((c) => ({
        name: c.name,
        descLen: String(c.description || '').replace(/<[^>]+>/g, ' ').trim().length,
        hasParkLink: /href=["']\/parks\//i.test(String(c.description || '')),
        seo_title: c.seo_title || null,
        meta: Boolean(c.meta_description),
        focus: Boolean(c.focus_keyword || c.focus_keyphrase),
      })),
      categories: (categories || []).map((c) => ({
        name: c.name,
        country: c.country,
        descLen: String(c.description || '').replace(/<[^>]+>/g, ' ').trim().length,
        hasParkLink: /href=["']\/parks\//i.test(String(c.description || '')),
        seo_title: c.seo_title || null,
      })),
    },
    null,
    2
  )
);
