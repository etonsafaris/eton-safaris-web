/**
 * Audit countries / categories / parks for missing descriptions and SEO.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { allParkEntries, PARKS_BY_COUNTRY } from './lib/national-parks-catalog.mjs';

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

async function fetchAll(supabase, table, columns = '*') {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

loadEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const [countries, categories, parks] = await Promise.all([
  fetchAll(supabase, 'countries'),
  fetchAll(supabase, 'categories'),
  fetchAll(supabase, 'national_park'),
]);

const parksByCountry = {};
for (const p of parks) {
  const c = String(p.country || '').trim() || '(none)';
  if (!parksByCountry[c]) parksByCountry[c] = [];
  parksByCountry[c].push(String(p.name || '').trim());
}

const catalogCountries = Object.keys(PARKS_BY_COUNTRY);
const missingParks = [];
for (const { country, park } of allParkEntries()) {
  const list = parksByCountry[country] || [];
  if (!list.some((n) => n.toLowerCase() === park.name.toLowerCase())) {
    missingParks.push(`${country} / ${park.name}`);
  }
}

const countryRows = countries.map((c) => {
  const name = String(c.name || c.title || '').trim();
  const desc = plain(c.description);
  return {
    id: c.id,
    name,
    descLen: desc.length,
    hasSeoTitle: Boolean(String(c.seo_title || '').trim()),
    hasMeta: Boolean(String(c.meta_description || '').trim()),
    hasFocus: Boolean(String(c.focus_keyword || c.focus_keyphrase || '').trim()),
    sample: desc.slice(0, 180),
  };
});

const categoryRows = categories.map((c) => {
  const name = String(c.name || c.title || '').trim();
  const country = String(c.country || '').trim();
  const desc = plain(c.description);
  return {
    id: c.id,
    name,
    country,
    descLen: desc.length,
    hasSeoTitle: Boolean(String(c.seo_title || '').trim()),
    hasMeta: Boolean(String(c.meta_description || '').trim()),
    hasFocus: Boolean(String(c.focus_keyword || c.focus_keyphrase || '').trim()),
    sample: desc.slice(0, 160),
  };
});

const report = {
  counts: {
    countries: countries.length,
    categories: categories.length,
    parks: parks.length,
    catalogParks: allParkEntries().length,
  },
  parksByCountry: Object.fromEntries(
    Object.entries(parksByCountry).map(([k, v]) => [k, v.length])
  ),
  catalogCountries,
  missingParks,
  thinCountries: countryRows.filter((r) => r.descLen < 250).sort((a, b) => a.descLen - b.descLen),
  richCountries: countryRows.filter((r) => r.descLen >= 250).map((r) => ({ name: r.name, descLen: r.descLen, hasSeoTitle: r.hasSeoTitle })),
  countriesMissingSeo: countryRows.filter((r) => !r.hasSeoTitle || !r.hasMeta || !r.hasFocus),
  thinCategories: categoryRows.filter((r) => r.descLen < 200).sort((a, b) => a.descLen - b.descLen),
  richCategories: categoryRows.filter((r) => r.descLen >= 200).length,
  categoriesMissingSeo: categoryRows.filter((r) => !r.hasSeoTitle || !r.hasMeta || !r.hasFocus).length,
  countryCols: countries[0] ? Object.keys(countries[0]) : [],
  categoryCols: categories[0] ? Object.keys(categories[0]) : [],
  ugandaSample: countryRows.find((r) => /uganda/i.test(r.name)),
  richCatSamples: categoryRows.filter((r) => r.descLen >= 200).slice(0, 8),
};

const out = resolve(process.cwd(), 'scripts', '.cache', 'audit-country-category.json');
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  counts: report.counts,
  missingParks: report.missingParks,
  thinCountries: report.thinCountries.map((r) => `${r.name} (${r.descLen})`),
  countriesMissingSeo: report.countriesMissingSeo.map((r) => r.name),
  thinCategoriesCount: report.thinCategories.length,
  thinCategoriesSample: report.thinCategories.slice(0, 25).map((r) => `${r.country}/${r.name} (${r.descLen})`),
  categoriesMissingSeo: report.categoriesMissingSeo,
  richCountries: report.richCountries,
  ugandaDescLen: report.ugandaSample?.descLen,
  out,
}, null, 2));
