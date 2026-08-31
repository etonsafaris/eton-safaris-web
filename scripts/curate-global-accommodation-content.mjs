/**
 * Curate overview + content blocks for accommodations globally.
 *
 * Usage:
 *   node scripts/curate-global-accommodation-content.mjs --dry-run
 *   node scripts/curate-global-accommodation-content.mjs
 *   node scripts/curate-global-accommodation-content.mjs --force
 *   node scripts/curate-global-accommodation-content.mjs --country Uganda
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import {
  buildCuratedStayContent,
  embedContent,
  inferPlacement,
  needsContentCuration,
  parseEmbed,
  parseKeywords,
  parkFromStay,
  slugify,
  stripStayBoilerplate,
} from './lib/stay-content-builders.mjs';

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

async function fetchAll(supabase, table, columns) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function loadCatalog() {
  const dir = resolve(process.cwd(), 'data');
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.startsWith('real-park-accommodations-') && f.endsWith('.json'))) {
    const rows = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const key = `${String(row.country || '').toLowerCase()}||${String(row.name || '').toLowerCase()}`;
      map.set(key, row);
    }
  }
  return map;
}

function countryKeywords(country, keywordRows) {
  const fromLibrary = keywordRows
    .filter((row) => String(row.country || '').trim().toLowerCase() === country.toLowerCase())
    .flatMap((row) => parseKeywords(row.keywords));
  const defaults = [
    `${country} safari`,
    `${country} wildlife safari`,
    `${country} tour packages`,
    `best ${country} safari`,
    `${country} safari holidays`,
    `${country} national parks`,
  ];
  const merged = [...fromLibrary, ...defaults]
    .map((item) => item.trim())
    .filter((item) => item.length >= 6 && item.length <= 42);
  const unique = [];
  for (const item of merged) {
    if (!unique.some((u) => u.toLowerCase() === item.toLowerCase())) unique.push(item);
    if (unique.length >= 20) break;
  }
  return unique.length ? unique : defaults;
}

function pickTourLinks(tours, country, count = 12) {
  const pool = tours.filter((t) => String(t.country || '').trim().toLowerCase() === country.toLowerCase());
  const links = [];
  for (let i = 0; i < Math.max(pool.length, count) && links.length < count; i += 1) {
    if (!pool.length) break;
    const tour = pool[(i * 7) % pool.length];
    const slug = String(tour.slug || tour.seo_slug || '').trim() || slugify(tour.title);
    if (!slug || links.some((l) => l.slug === slug)) continue;
    links.push({ slug, title: String(tour.title || slug) });
  }
  return links;
}

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const countryIdx = args.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(args[countryIdx + 1] || '').trim() : '';
const onlyNameIdx = args.indexOf('--name');
const onlyName = onlyNameIdx >= 0 ? String(args[onlyNameIdx + 1] || '').trim().toLowerCase() : '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const catalog = loadCatalog();
const stayColumnSets = [
  'id,name,country,location,type,description,description_title,national_park_name,focus_keyword,focus_keyphrase',
  'id,name,country,location,type,description,description_title,national_park_name,focus_keyword',
  'id,name,country,location,type,description,description_title,national_park_name',
  'id,name,country,location,type,description,description_title',
];

let stays = [];
for (const columns of stayColumnSets) {
  try {
    stays = await fetchAll(supabase, 'accommodations', columns);
    break;
  } catch (error) {
    if (!/column .* does not exist/i.test(String(error.message || ''))) throw error;
  }
}

const [tours, keywordRows] = await Promise.all([
  fetchAll(supabase, 'tours', 'title,slug,seo_slug,country'),
  fetchAll(supabase, 'keywords', 'country,keywords').catch(() => []),
]);

const scoped = stays.filter((stay) => {
  const country = String(stay.country || '').trim();
  if (onlyCountry && country.toLowerCase() !== onlyCountry.toLowerCase()) return false;
  if (onlyName && String(stay.name || '').trim().toLowerCase() !== onlyName) return false;
  return Boolean(country);
});

const targets = scoped.filter((stay) => needsContentCuration(stay, { force }));

console.log(
  `Accommodations: ${scoped.length}; to curate: ${targets.length}; dryRun=${dryRun}; force=${force}`
);

const tourLinksByCountry = new Map();
const phrasesByCountry = new Map();

let updated = 0;
let failed = 0;

for (let index = 0; index < targets.length; index += 1) {
  const stay = targets[index];
  const name = String(stay.name || '').trim();
  const country = String(stay.country || '').trim();
  const type = String(stay.type || 'Safari Lodge').trim();
  const parkName = parkFromStay(stay);
  const location = String(stay.location || '').trim();
  const catalogEntry = catalog.get(`${country.toLowerCase()}||${name.toLowerCase()}`) || null;
  const placement = catalogEntry?.placement || inferPlacement(location, parkName);
  const parsed = parseEmbed(stripStayBoilerplate(stay.description));
  const focus = String(stay.focus_keyphrase || stay.focus_keyword || `${name} ${country}`).toLowerCase();

  if (!phrasesByCountry.has(country)) {
    phrasesByCountry.set(country, countryKeywords(country, keywordRows));
    tourLinksByCountry.set(country, pickTourLinks(tours, country, 16));
  }

  const curated = buildCuratedStayContent({
    name,
    type: catalogEntry?.type || type,
    country,
    parkName,
    location,
    placement,
    phrases: phrasesByCountry.get(country) || [],
    tourLinks: tourLinksByCountry.get(country) || [],
    seed: index + name.length,
    catalogEntry,
  });

  const seoLead = `<p>${name} in ${parkName} — ${focus} stays arranged by Eton Safaris.</p>`;
  const fields = {
    ...parsed.fields,
    description_title: parsed.fields.description_title || stay.description_title || curated.description_title,
    type: catalogEntry?.type || type,
    national_park: parkName,
    location,
    country,
    website: parsed.fields.website || catalogEntry?.website || '',
    placement,
    published_at: parsed.fields.published_at || stay.published_at || new Date().toISOString(),
  };

  const description = embedContent(`${seoLead}\n${curated.description}`, curated.blocks, fields);
  const payload = {
    description,
    description_title: fields.description_title,
    updated_date: new Date().toISOString(),
  };

  if (dryRun) {
    if (index < 5 || index % 100 === 0) {
      console.log(`[dry-run] ${country} / ${name} → ${curated.blocks.length} blocks`);
    }
    updated += 1;
    continue;
  }

  const { error } = await supabase.from('accommodations').update(payload).eq('id', stay.id);
  if (error) {
    failed += 1;
    console.warn('Failed', name, error.message);
  } else {
    updated += 1;
    if (updated % 50 === 0) console.log(`… curated ${updated}/${targets.length}`);
  }
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 40));
}

console.log(JSON.stringify({ ok: true, dryRun, force, updated, failed, processed: targets.length }, null, 2));
