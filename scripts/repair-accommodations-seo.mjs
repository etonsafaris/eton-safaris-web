/**
 * Repair accommodation SEO fields so every stay scores 100% in the admin SEO panel.
 *
 * Usage:
 *   node scripts/repair-accommodations-seo.mjs --dry-run
 *   node scripts/repair-accommodations-seo.mjs
 *   node scripts/repair-accommodations-seo.mjs --country Uganda
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const SITE_URL = 'https://etonsafaris.com';
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1516426122078-c23e76319840?auto=format&fit=crop&w=1200&q=70';

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

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function clip(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripEmbedded(value) {
  return String(value || '')
    .replace(/<!--ETON_CONTENT:[\s\S]*?-->/g, '')
    .trim();
}

function parseBlocks(record) {
  const raw = record.accommodation_blocks || record.post_blocks;
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* fall through */
    }
  }
  const embed = String(record.description || '').match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (!embed) return [];
  try {
    const payload = JSON.parse(decodeURIComponent(embed[1]));
    return Array.isArray(payload.blocks) ? payload.blocks : [];
  } catch {
    return [];
  }
}

function contentForSeo(record) {
  const body = stripEmbedded(record.description);
  const blocks = parseBlocks(record);
  return `${body}\n${blocks.map((block) => block.description || '').join('\n')}`.trim();
}

function stayParkName(stay) {
  const fromCol = String(stay.national_park_name || stay.national_park || stay.park || stay.park_name || '').trim();
  if (fromCol) return fromCol;
  const fromLoc = String(stay.location || '').match(/\b(?:Inside|Edge of|Near|Outside)\s+(.+)$/i);
  if (fromLoc?.[1]) return fromLoc[1].trim();
  const embed = String(stay.description || '').match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (embed) {
    try {
      const payload = JSON.parse(decodeURIComponent(embed[1]));
      const name = payload?.fields?.national_park;
      if (name) return String(name).trim();
    } catch {
      /* ignore */
    }
  }
  return '';
}

function normalizedKeyphrase(name, country) {
  return `${slugify(name).replace(/-/g, ' ')} ${country.toLowerCase()}`.replace(/\s+/g, ' ').trim();
}

function shortParkName(parkName) {
  return String(parkName || '')
    .replace(
      /\b(National Park|National Reserve|Conservation Area|Game Reserve|Nature Reserve|Protected Area|Protectorate|Marine National Park|Transfrontier Park)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function parseKeywordList(value) {
  if (Array.isArray(value)) return value.map(String).filter((item) => item.trim());
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter((item) => item.trim());
  } catch {
    /* fall through */
  }
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function analyzeSeo(values, content = '') {
  const items = [];
  const keyphrase = values.focus_keyphrase.trim();
  const title = values.seo_title.trim();
  const description = values.meta_description.trim();
  const body = stripHtml(content).toLowerCase();
  const key = keyphrase.toLowerCase();
  const slug = values.slug.trim().toLowerCase();

  if (!keyphrase) items.push({ type: 'error' });
  else {
    if (!title.toLowerCase().includes(key)) items.push({ type: 'error' });
    if (!description.toLowerCase().includes(key)) items.push({ type: 'error' });
    if (
      slug &&
      !(
        slug.replace(/-/g, ' ').includes(key.replace(/\s+/g, ' ')) ||
        slug.includes(key.replace(/\s+/g, '-'))
      )
    ) {
      items.push({ type: 'info' });
    }
    if (body && !body.includes(key)) items.push({ type: 'error' });
  }

  if (!title) items.push({ type: 'error' });
  else if (title.length < 30 || title.length > 60) items.push({ type: 'info' });

  if (!description) items.push({ type: 'error' });
  else if (description.length < 70 || description.length > 160) items.push({ type: 'info' });

  if (!values.slug.trim()) items.push({ type: 'error' });
  if (!values.focus_keywords.length) items.push({ type: 'error' });
  if (!values.social_image_url) items.push({ type: 'error' });
  if (!values.canonical_url) items.push({ type: 'info' });
  if (!values.robots_index) items.push({ type: 'error' });
  if (!values.robots_follow) items.push({ type: 'info' });
  if (!values.og_title || !values.og_description) items.push({ type: 'info' });
  if (!values.schema_type && !values.seo_schema) items.push({ type: 'info' });

  return items;
}

function seoScorePercent(values, content = '') {
  const items = analyzeSeo(values, content);
  let score = 100;
  for (const item of items) {
    if (item.type === 'error') score -= 12;
    else if (item.type === 'info') score -= 4;
  }
  return Math.max(0, Math.min(100, score));
}

function buildSeoTitle(name, country, focusKeyphrase) {
  const plainName = slugify(name).replace(/-/g, ' ');
  const candidates = [
    `${plainName} ${country} safari lodge | eton safaris`,
    `${plainName} ${country} | eton safaris`,
    `${focusKeyphrase} | eton safaris`,
    `${focusKeyphrase} safari lodge | eton safaris`,
  ];
  for (const candidate of candidates) {
    const clipped = clip(candidate, 60);
    if (
      clipped.length >= 30 &&
      clipped.length <= 60 &&
      clipped.toLowerCase().includes(focusKeyphrase)
    ) {
      return clipped;
    }
  }
  let title = clip(`${focusKeyphrase} | eton safaris`, 60);
  if (title.length < 30) title = clip(`${focusKeyphrase} safari lodge stay`, 60);
  return title;
}

function buildMetaDescription(name, type, parkName, country, focusKeyphrase) {
  const park = parkName || country;
  let meta = `${focusKeyphrase} — ${name} is a ${String(type || 'safari lodge').toLowerCase()} in ${park}. Book your stay with Eton Safaris for expert safari planning.`;
  if (meta.length < 70) {
    meta = `${focusKeyphrase} — ${name} offers comfortable rooms, guided wildlife access, and reliable safari logistics in ${park}. Book with Eton Safaris today.`;
  }
  if (meta.length < 70) {
    meta = `${meta} Plan your ${country} safari with Eton Safaris.`;
  }
  return clip(meta, 160);
}

function ensureDescriptionHasKeyphrase(description, focusKeyphrase, name, parkName, country) {
  const raw = String(description || '');
  const embedMatch = raw.match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  let body = stripEmbedded(raw);
  const plain = stripHtml(body).toLowerCase();
  const key = focusKeyphrase.toLowerCase();

  if (!plain.includes(key)) {
    const lead = `${name} in ${parkName || country} — ${focusKeyphrase} stays arranged by Eton Safaris.`;
    body = body ? `<p>${lead}</p>\n${body}` : `<p>${lead}</p>`;
  }

  if (!body) {
    body = `<p>${focusKeyphrase} — ${name} is a trusted safari stay in ${parkName || country}, booked through Eton Safaris.</p>`;
  }

  if (embedMatch) {
    return `${body}\n<!--ETON_CONTENT:${embedMatch[1]}-->`;
  }
  return body;
}

function buildStaySeo(stay, parkImageByCountry, usedSlugs) {
  const name = String(stay.name || '').trim();
  const country = String(stay.country || '').trim();
  const type = String(stay.type || 'Safari Lodge').trim();
  const parkName = stayParkName(stay);
  const parkShort = shortParkName(parkName) || country;
  const focusKeyphrase = normalizedKeyphrase(name, country);

  let slug = slugify(`${name}-${country}`);
  let n = 2;
  const existingSlug = slugify(stay.seo_slug);
  if (existingSlug && (existingSlug.includes(focusKeyphrase.replace(/\s+/g, '-')) || existingSlug.replace(/-/g, ' ').includes(focusKeyphrase))) {
    slug = existingSlug;
  }
  while (usedSlugs.has(slug) && existingSlug !== slug) {
    slug = `${slugify(`${name}-${country}`).slice(0, 70)}-${n}`;
    n += 1;
  }
  usedSlugs.add(slug);

  const seoTitle = buildSeoTitle(name, country, focusKeyphrase);
  const metaDescription = buildMetaDescription(name, type, parkName, country, focusKeyphrase);
  const image =
    String(stay.social_image_url || stay.image_url || '').trim() ||
    parkImageByCountry.get(country.toLowerCase()) ||
    DEFAULT_IMAGE;
  const canonical = `${SITE_URL}/accommodations/${slug}`;
  const ogTitle = clip(name, 70);
  const ogDescription = metaDescription;

  const focusKeywords = Array.from(
    new Set([
      focusKeyphrase,
      `${name} ${parkShort}`.toLowerCase(),
      `${country} safari lodge`,
      `${parkShort} accommodation`.toLowerCase(),
      `${country} safari accommodation`,
      ...parseKeywordList(stay.focus_keywords).slice(0, 8).map((item) => item.toLowerCase()),
    ])
  ).filter(Boolean);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name,
    description: metaDescription,
    image,
    url: canonical,
    address: {
      '@type': 'PostalAddress',
      addressCountry: country,
      addressRegion: parkName || country,
    },
    _etonSeo: {
      canonical_url: canonical,
      robots_index: true,
      robots_follow: true,
      robots_advanced: [],
      breadcrumb_title: name,
      og_title: ogTitle,
      og_description: ogDescription,
      schema_type: 'LodgingBusiness',
    },
  };

  const seoValues = {
    focus_keyphrase: focusKeyphrase,
    seo_title: seoTitle,
    slug,
    meta_description: metaDescription,
    social_image_url: image,
    focus_keywords: focusKeywords,
    seo_schema: JSON.stringify(schema),
    schema_type: 'LodgingBusiness',
    canonical_url: canonical,
    robots_index: true,
    robots_follow: true,
    robots_advanced: [],
    breadcrumb_title: name,
    og_title: ogTitle,
    og_description: ogDescription,
  };

  const description = ensureDescriptionHasKeyphrase(
    stay.description,
    focusKeyphrase,
    name,
    parkName,
    country
  );
  const content = contentForSeo({ ...stay, description });

  return {
    seoValues,
    content,
    description,
    payload: {
      seo_slug: slug,
      seo_title: seoTitle,
      meta_description: metaDescription,
      focus_keyphrase: focusKeyphrase,
      focus_keyword: focusKeyphrase,
      focus_keywords: focusKeywords,
      social_image_url: image,
      seo_schema: JSON.stringify(schema),
      schema_type: 'LodgingBusiness',
      canonical_url: canonical,
      robots_index: true,
      robots_follow: true,
      breadcrumb_title: name,
      og_title: ogTitle,
      og_description: ogDescription,
      seo_settings: JSON.stringify({
        canonical_url: canonical,
        robots_index: true,
        robots_follow: true,
        robots_advanced: [],
        breadcrumb_title: name,
        og_title: ogTitle,
        og_description: ogDescription,
        schema_type: 'LodgingBusiness',
        seo_schema: JSON.stringify(schema),
      }),
      description,
      updated_date: new Date().toISOString(),
    },
  };
}

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i);
  return match?.[1] || null;
}

async function fetchAll(supabase, table, columns) {
  const pageSize = 500;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
      if (!error) {
        rows.push(...(data || []));
        if (!data || data.length < pageSize) return rows;
        lastError = null;
        break;
      }
      lastError = error;
      if (!/timeout|fetch failed|520|502|503|504/i.test(error.message || '')) {
        throw new Error(`${table}: ${error.message}`);
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
    if (lastError) throw new Error(`${table}: ${lastError.message}`);
  }
  return rows;
}

const droppedColumns = new Set();

async function updateStay(supabase, id, payload) {
  let current = { ...payload };
  for (const column of droppedColumns) {
    if (column in current) delete current[column];
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { error } = await supabase.from('accommodations').update(current).eq('id', id);
    if (!error) return { ok: true };
    const column = missingColumn(error.message || '');
    if (column && column in current) {
      droppedColumns.add(column);
      delete current[column];
      continue;
    }
    if (Array.isArray(current.focus_keywords) && /invalid|json|array/i.test(error.message || '')) {
      current = { ...current, focus_keywords: JSON.stringify(current.focus_keywords) };
      continue;
    }
    if (/520|521|522|523|524|502|503|504|fetch failed|<!DOCTYPE html>/i.test(error.message || '') && attempt < 6) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      continue;
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: 'update failed' };
}

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const countryIdx = args.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(args[countryIdx + 1] || '').trim() : '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function fetchAccommodations(supabase) {
  const columnSets = [
    'id,name,seo_slug,country,type,location,description,accommodation_blocks,post_blocks,image_url,social_image_url,focus_keyphrase,focus_keyword,focus_keywords,seo_title,meta_description,national_park_name,national_park_id',
    'id,name,seo_slug,country,type,location,description,accommodation_blocks,post_blocks,image_url,social_image_url,focus_keyphrase,focus_keyword,focus_keywords,seo_title,meta_description,national_park_name',
    'id,name,seo_slug,country,type,location,description,image_url,social_image_url,seo_title,meta_description',
  ];
  for (const columns of columnSets) {
    try {
      return await fetchAll(supabase, 'accommodations', columns);
    } catch (error) {
      if (!/column .* does not exist/i.test(String(error.message || ''))) throw error;
    }
  }
  throw new Error('accommodations: could not load rows with any column set');
}

const [stays, parks] = await Promise.all([
  fetchAccommodations(supabase),
  fetchAll(supabase, 'national_park', 'country,image_url').catch(() => []),
]);

const parkImageByCountry = new Map();
for (const park of parks) {
  const country = String(park.country || '').trim().toLowerCase();
  const image = String(park.image_url || '').trim();
  if (country && image && !parkImageByCountry.has(country)) {
    parkImageByCountry.set(country, image);
  }
}

const usedSlugs = new Set();
const jobs = [];
let belowPerfect = 0;

for (const stay of stays) {
  const country = String(stay.country || '').trim();
  if (onlyCountry && country.toLowerCase() !== onlyCountry.toLowerCase()) continue;
  if (!String(stay.name || '').trim()) continue;

  const built = buildStaySeo(stay, parkImageByCountry, usedSlugs);
  const score = seoScorePercent(built.seoValues, built.content);
  if (score < 100) belowPerfect += 1;

  jobs.push({
    id: stay.id,
    name: stay.name,
    score,
    payload: built.payload,
    focusKeyphrase: built.seoValues.focus_keyphrase,
    seoTitle: built.seoValues.seo_title,
  });
}

if (dryRun) {
  for (const job of jobs.slice(0, 8)) {
    console.log(`[dry-run] ${job.name} → score ${job.score}% | ${job.focusKeyphrase}`);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: true,
        total: stays.length,
        queued: jobs.length,
        belowPerfect,
        sampleSeoTitle: jobs[0]?.seoTitle,
      },
      null,
      2
    )
  );
  process.exit(0);
}

let updated = 0;
let failed = 0;
const CONCURRENCY = 8;
let cursor = 0;

async function worker() {
  while (cursor < jobs.length) {
    const index = cursor;
    cursor += 1;
    const job = jobs[index];
    const result = await updateStay(supabase, job.id, job.payload);
    if (!result.ok) {
      failed += 1;
      console.warn('Failed', job.id, job.name, result.error);
    } else {
      updated += 1;
      if (updated % 50 === 0) console.log(`… updated ${updated}/${jobs.length}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

if (droppedColumns.size) {
  console.log('Dropped missing columns:', [...droppedColumns].join(', '));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      dryRun,
      updated,
      failed,
      queued: jobs.length,
      belowPerfectBefore: belowPerfect,
      total: stays.length,
    },
    null,
    2
  )
);
