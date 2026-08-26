/**
 * Curate missing country/category descriptions, hyperlink park mentions to /parks/{slug},
 * set SEO on every country & category page, and ensure park seo_slug values exist.
 *
 * Usage:
 *   node scripts/curate-country-category-copy.mjs --dry-run
 *   node scripts/curate-country-category-copy.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { PARKS_BY_COUNTRY } from './lib/national-parks-catalog.mjs';
import {
  buildCategoryDescription,
  buildCountryDescription,
  countryHeadline,
} from './lib/country-category-copy.mjs';
import {
  appendParksDirectory,
  clip,
  extractEmbed,
  hyperlinkParksInHtml,
  plainText,
  slugify,
  stripEmbed,
  withEmbed,
} from './lib/park-hyperlink.mjs';

const SITE_URL = 'https://etonsafaris.com';
const THIN_COUNTRY = 250;
const THIN_CATEGORY = 200;

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

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i);
  return match?.[1] || null;
}

function weakSeoTitle(title) {
  const t = String(title || '').trim();
  if (!t) return true;
  if (t.length < 12) return true;
  if (/^[a-z]$/i.test(t)) return true;
  return false;
}

function normalizeCountryKey(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function countrySlug(name) {
  return slugify(name);
}

function parksForCountry(allParks, countryName) {
  const key = normalizeCountryKey(countryName).toLowerCase();
  return allParks.filter((p) => normalizeCountryKey(p.country).toLowerCase() === key);
}

function buildCountrySeo(countryName, descriptionHtml, existing) {
  const slug = countrySlug(countryName);
  const plain = plainText(descriptionHtml);
  const focus = `${countryName} safaris`.toLowerCase();
  const title = weakSeoTitle(existing.seo_title)
    ? clip(`${countryHeadline(countryName)} | Eton Safaris`, 60)
    : String(existing.seo_title).trim();
  const meta =
    String(existing.meta_description || '').trim().length >= 80
      ? String(existing.meta_description).trim()
      : clip(plain || `${countryName} safari tours and national parks with Eton Safaris.`, 155);
  const focusKeywords = Array.from(
    new Set([
      focus,
      `${countryName} national parks`.toLowerCase(),
      `${countryName} safari tours`.toLowerCase(),
      `best ${countryName} safari`.toLowerCase(),
    ])
  );
  const canonical = `${SITE_URL}/destinations/${slug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: countryName,
    description: meta,
    url: canonical,
    _etonSeo: {
      canonical_url: canonical,
      robots_index: true,
      robots_follow: true,
      breadcrumb_title: countryName,
      og_title: title,
      og_description: meta,
      schema_type: 'TouristDestination',
    },
  };
  return {
    seo_title: title,
    meta_description: meta,
    focus_keyword: focus,
    focus_keyphrase: focus,
    focus_keywords: focusKeywords,
    seo_slug: slug,
    seo_schema: JSON.stringify(schema),
    social_image_url: existing.social_image_url || existing.image_url || '',
  };
}

function buildCategorySeo(categoryName, countryName, descriptionHtml, existing) {
  const cSlug = countrySlug(countryName);
  const catSlug = slugify(categoryName);
  const plain = plainText(descriptionHtml);
  const focus = String(categoryName || '').trim().toLowerCase();
  const title = weakSeoTitle(existing.seo_title)
    ? clip(`${categoryName} | Eton Safaris`, 60)
    : String(existing.seo_title).trim();
  const meta =
    String(existing.meta_description || '').trim().length >= 80
      ? String(existing.meta_description).trim()
      : clip(plain || `${categoryName} planned by Eton Safaris.`, 155);
  const focusKeywords = Array.from(
    new Set([focus, `${countryName} safaris`.toLowerCase(), `${countryName} national parks`.toLowerCase()])
  );
  const canonical = `${SITE_URL}/${cSlug}-safaris/${catSlug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: categoryName,
    description: meta,
    url: canonical,
    touristType: 'Safari traveller',
    _etonSeo: {
      canonical_url: canonical,
      robots_index: true,
      robots_follow: true,
      breadcrumb_title: categoryName,
      og_title: title,
      og_description: meta,
      schema_type: 'TouristTrip',
    },
  };
  return {
    seo_title: title,
    meta_description: meta,
    focus_keyword: focus,
    focus_keyphrase: focus,
    focus_keywords: focusKeywords,
    seo_slug: catSlug,
    seo_schema: JSON.stringify(schema),
    social_image_url: existing.social_image_url || existing.image_url || '',
  };
}

async function updateWithFallback(supabase, table, id, payload) {
  let current = { ...payload };
  const dropped = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { error } = await supabase.from(table).update(current).eq('id', id);
    if (!error) return { ok: true, dropped };
    const column = missingColumn(error.message || '');
    if (column && column in current) {
      dropped.push(column);
      delete current[column];
      continue;
    }
    if (Array.isArray(current.focus_keywords)) {
      current = { ...current, focus_keywords: JSON.stringify(current.focus_keywords) };
      continue;
    }
    return { ok: false, error: error.message, dropped };
  }
  return { ok: false, error: 'update failed', dropped };
}

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const cacheDir = resolve(process.cwd(), 'scripts', '.cache');
mkdirSync(cacheDir, { recursive: true });

const [countries, categories, parks] = await Promise.all([
  fetchAll(supabase, 'countries'),
  fetchAll(supabase, 'categories'),
  fetchAll(supabase, 'national_park'),
]);

const summary = {
  dryRun,
  parksSlugUpdated: 0,
  countriesRewritten: [],
  countriesLinkedOnly: [],
  categoriesRewritten: [],
  categoriesLinkedOnly: [],
  seoUpdated: { countries: 0, categories: 0, parks: 0 },
  failed: [],
};

// 1) Ensure every park has seo_slug for clean /parks/{slug} URLs
for (const park of parks) {
  const name = String(park.name || '').trim();
  const desired = slugify(name);
  const current = slugify(park.seo_slug || '');
  if (!desired || current === desired) continue;
  if (dryRun) {
    summary.parksSlugUpdated += 1;
    continue;
  }
  const result = await updateWithFallback(supabase, 'national_park', park.id, { seo_slug: desired });
  if (result.ok) {
    park.seo_slug = desired;
    summary.parksSlugUpdated += 1;
    summary.seoUpdated.parks += 1;
  } else {
    summary.failed.push({ type: 'park-slug', name, error: result.error });
  }
}

// 2) Countries
for (const row of countries) {
  const name = normalizeCountryKey(row.name || row.title);
  if (!name) continue;
  const countryParks = parksForCountry(parks, name);
  const catalogParks = PARKS_BY_COUNTRY[name] || [];
  // Prefer live DB parks; fall back to catalog names for linking targets
  const linkParks =
    countryParks.length > 0
      ? countryParks
      : catalogParks.map((p) => ({ name: p.name, seo_slug: slugify(p.name), country: name }));

  const existingPlainLen = plainText(row.description).length;
  let nextHtml;
  let mode;

  if (existingPlainLen < THIN_COUNTRY) {
    nextHtml = withEmbed(buildCountryDescription(name), row.description);
    nextHtml = hyperlinkParksInHtml(nextHtml, linkParks);
    mode = 'rewrite';
    summary.countriesRewritten.push(name);
  } else {
    nextHtml = hyperlinkParksInHtml(row.description, linkParks);
    mode = 'link';
    summary.countriesLinkedOnly.push(name);
  }

  // Always refresh the full park directory from the catalog so every park is named and linked
  const directorySource =
    catalogParks.length > 0
      ? catalogParks.map((park) => ({
          name: park.name,
          seo_slug: slugify(park.name),
          hook: park.hook || '',
        }))
      : linkParks.map((park) => ({
          name: park.name,
          seo_slug: park.seo_slug || slugify(park.name),
          hook: park.hook || '',
        }));
  nextHtml = appendParksDirectory(nextHtml, name, directorySource);
  // Merge catalog names into link targets so directory + prose both hyperlink
  const linkTargets = [
    ...linkParks,
    ...catalogParks.map((park) => ({ name: park.name, seo_slug: slugify(park.name), country: name })),
  ];
  nextHtml = hyperlinkParksInHtml(nextHtml, linkTargets);

  const seo = buildCountrySeo(name, nextHtml, row);
  const payload = {
    description: nextHtml,
    ...seo,
  };

  if (dryRun) {
    summary.seoUpdated.countries += 1;
    continue;
  }

  const result = await updateWithFallback(supabase, 'countries', row.id, payload);
  if (!result.ok) {
    summary.failed.push({ type: 'country', name, error: result.error, dropped: result.dropped });
  } else {
    summary.seoUpdated.countries += 1;
    console.log(`${mode === 'rewrite' ? 'Rewrote' : 'Linked'} country: ${name}`);
  }
}

// 3) Categories
for (const row of categories) {
  const name = String(row.name || row.title || '').trim();
  const country = normalizeCountryKey(row.country);
  if (!name) continue;
  const countryParks = parksForCountry(parks, country);
  const catalogParks = PARKS_BY_COUNTRY[country] || [];
  const linkParks =
    catalogParks.length > 0
      ? catalogParks.map((p) => ({ name: p.name, seo_slug: slugify(p.name), country }))
      : countryParks.length > 0
        ? countryParks
        : [];

  const existingPlainLen = plainText(row.description).length;
  let nextHtml;
  let mode;

  if (existingPlainLen < THIN_CATEGORY) {
    nextHtml = withEmbed(buildCategoryDescription(name, country || 'Africa', linkParks), row.description);
    nextHtml = hyperlinkParksInHtml(nextHtml, linkParks);
    mode = 'rewrite';
    summary.categoriesRewritten.push(`${country}/${name}`);
  } else {
    nextHtml = hyperlinkParksInHtml(row.description, linkParks);
    mode = 'link';
    summary.categoriesLinkedOnly.push(`${country}/${name}`);
  }

  const seo = buildCategorySeo(name, country || name, nextHtml, row);
  const payload = {
    description: nextHtml,
    ...seo,
  };

  if (dryRun) {
    summary.seoUpdated.categories += 1;
    continue;
  }

  const result = await updateWithFallback(supabase, 'categories', row.id, payload);
  if (!result.ok) {
    summary.failed.push({ type: 'category', name, error: result.error, dropped: result.dropped });
  } else {
    summary.seoUpdated.categories += 1;
    console.log(`${mode === 'rewrite' ? 'Rewrote' : 'Linked'} category: ${country}/${name}`);
  }
}

const out = resolve(cacheDir, 'curate-country-category-result.json');
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${out}`);
