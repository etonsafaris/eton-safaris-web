/**
 * Globally repair tour titles, remove dashes/hyphens from tour copy,
 * align categories, and set SEO fields for a strong score.
 *
 * Usage:
 *   node scripts/repair-tour-titles-seo.mjs --dry-run
 *   node scripts/repair-tour-titles-seo.mjs
 *   node scripts/repair-tour-titles-seo.mjs --country Uganda
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { blueprintForCountry } from './lib/tour-package-blueprints.mjs';

const SITE_URL = 'https://etonsafaris.com';

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
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function stripDashes(value) {
  return String(value || '')
    .replace(/[\u2010-\u2015\u2212—–−]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (['in', 'of', 'and', 'the', 'a', 'an', 'to', 'for', 'on'].includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .replace(/^(in|of|and|the|a|an|to|for|on)\s+/i, (m) => m.charAt(0).toUpperCase() + m.slice(1));
}

function topicFromCategory(category, country) {
  let topic = String(category || '').trim();
  const countryRe = new RegExp(`\\b${String(country || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  topic = topic.replace(countryRe, ' ').replace(/\s+/g, ' ').trim();
  topic = topic.replace(/\b\d+\s*days?\b/gi, ' ').replace(/\s+/g, ' ').trim();

  if (/gorilla/i.test(topic)) return 'Gorilla Trekking';
  if (/chimpanzee|chimp/i.test(topic)) return 'Chimpanzee Tracking';
  if (/beach/i.test(topic)) return 'Beach Holiday';
  if (/mountain|climb/i.test(topic)) return 'Mountain Climbing';
  if (/wildlife/i.test(topic)) return 'Wildlife Safari';
  if (/bird/i.test(topic)) return 'Birding Safari';
  if (/culture|community/i.test(topic)) return 'Cultural Tour';

  topic = topic
    .replace(/\b(safaris|safari|tours|tour|holidays|holiday|packages|package)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!topic || /^safari$/i.test(topic)) topic = 'Wildlife Safari';
  return titleCase(topic);
}

function cleanKeyword(keyword, country, days) {
  let text = String(keyword || '').trim();
  const countryRe = new RegExp(`\\b${String(country || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  text = text.replace(countryRe, ' ');
  text = text.replace(new RegExp(`\\b${days}\\s*days?\\b`, 'gi'), ' ');
  text = text.replace(/\b\d+\s*days?\b/gi, ' ');
  text = stripDashes(text).replace(/\s+/g, ' ').trim();
  if (/\band\b|\bconference\b|\bfly in\b|\blodge safari\b|\bgroup safaris\b|\bbest safari in\b/i.test(text)) {
    return '';
  }
  if (text.length < 4 || text.length > 40) return '';
  return text;
}

function pick(list, seed) {
  if (!list?.length) return '';
  return list[Math.abs(seed) % list.length];
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

function buildTitle({ days, country, topic, park, variant, keyword }) {
  const parkShort = stripDashes(
    String(park || '')
      .replace(/National Park|National Reserve|Conservancy|Forest Reserve|Game Reserve|Marine Park/gi, '')
      .trim()
  );
  const keywordPhrase = titleCase(cleanKeyword(keyword, country, days));
  const phrase = keywordPhrase || topic;
  const hasSafari = /\bsafari\b/i.test(phrase);
  const pattern = (variant + days) % 5;
  if (pattern === 0) {
    return stripDashes(
      hasSafari
        ? `${days} Day ${phrase} in ${parkShort || country}`
        : `${days} Day ${phrase} Safari in ${parkShort || country}`
    );
  }
  if (pattern === 1) return stripDashes(`${days} Day ${country} ${phrase} Tour`);
  if (pattern === 2) return stripDashes(`${days} Day ${phrase} Experience in ${country}`);
  if (pattern === 3) return stripDashes(`${days} Day ${phrase} Package in ${parkShort || country}`);
  return stripDashes(hasSafari ? `${days} Day Classic ${phrase}` : `${days} Day Classic ${phrase} Safari`);
}

function clip(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function stripHyphensFromDescription(description, focusPhrase, days, country, topic) {
  const raw = String(description || '');
  const embedMatch = raw.match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  let body = raw.replace(/<!--ETON_CONTENT:[\s\S]*?-->/, '').trim();
  body = stripDashes(body);
  // Ensure focus phrase appears in body for SEO
  if (focusPhrase && !body.toLowerCase().includes(focusPhrase.toLowerCase())) {
    body = `${focusPhrase} is the heart of this ${days} day ${country} itinerary. ${body}`;
  }
  if (!body) {
    body = `This ${days} day ${country} ${topic.toLowerCase()} safari is designed by Eton Safaris with clear daily pacing, lodge stays, and guided wildlife access.`;
  }

  let embed = '';
  if (embedMatch) {
    try {
      const payload = JSON.parse(decodeURIComponent(embedMatch[1]));
      if (Array.isArray(payload.itineraries)) {
        payload.itineraries = payload.itineraries.map((day) => ({
          ...day,
          title: stripDashes(day.title || ''),
          description: stripDashes(day.description || ''),
          mealPlan: stripDashes(day.mealPlan || day.meal_plan || ''),
          accommodationPlan: stripDashes(day.accommodationPlan || day.accommodation_plan || ''),
        }));
      }
      embed = `\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify(payload))}-->`;
    } catch {
      embed = `\n<!--ETON_CONTENT:${embedMatch[1]}-->`;
    }
  }
  return `${body}${embed}`;
}

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i);
  return match?.[1] || null;
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

const droppedColumns = new Set();

async function updateTour(supabase, id, payload) {
  let current = { ...payload };
  for (const column of droppedColumns) {
    if (column in current) delete current[column];
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { error } = await supabase.from('tours').update(current).eq('id', id);
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

const [tours, categories, keywordRows] = await Promise.all([
  fetchAll(
    supabase,
    'tours',
    'id,title,slug,country,category,duration_days,description,image_url'
  ),
  fetchAll(supabase, 'categories', 'id,name,country,slug'),
  fetchAll(supabase, 'keywords', 'country,category,keywords'),
]);

const keywordMap = new Map();
for (const row of keywordRows) {
  const key = `${String(row.country || '').trim().toLowerCase()}||${String(row.category || '').trim().toLowerCase()}`;
  keywordMap.set(key, parseKeywordList(row.keywords));
}

const categoryByKey = new Map();
for (const cat of categories) {
  const country = String(cat.country || '').trim();
  const name = String(cat.name || '').trim();
  if (country && name) categoryByKey.set(`${country.toLowerCase()}||${name.toLowerCase()}`, name);
}

const usedSlugs = new Set();
let updated = 0;
let failed = 0;
let skippedHandcrafted = 0;
const jobs = [];

const handcraftedTitles = new Set([
  '2 day gorilla trekking safari in bwindi',
  '1 day uganda gorilla safari experience',
]);

for (let index = 0; index < tours.length; index += 1) {
  const tour = tours[index];
  const country = String(tour.country || '').trim();
  if (onlyCountry && country.toLowerCase() !== onlyCountry.toLowerCase()) continue;

  const categoryRaw = String(tour.category || '').trim();
  const category =
    categoryByKey.get(`${country.toLowerCase()}||${categoryRaw.toLowerCase()}`) || categoryRaw;
  const days = Number(tour.duration_days) || 1;
  const topic = topicFromCategory(category, country);
  const blueprint = blueprintForCountry(country);
  const park = pick(blueprint.parks, index * 11 + days);
  const library = keywordMap.get(`${country.toLowerCase()}||${category.toLowerCase()}`) || [];
  const originalTitleLower = String(tour.title || '').toLowerCase().trim();
  const keepTitle = handcraftedTitles.has(originalTitleLower);
  if (keepTitle) skippedHandcrafted += 1;

  const sensibleKeywords = library
    .map((item) => cleanKeyword(item, country, days))
    .filter((item) => item && item.length < 48);
  const title = keepTitle
    ? stripDashes(tour.title)
    : buildTitle({
        days,
        country,
        topic,
        park,
        variant: index + 1,
        keyword: topic,
      });
  const focusKeyphrase = topic.toLowerCase();
  const focusKeywords = Array.from(
    new Set([
      focusKeyphrase,
      `${country} ${topic}`.toLowerCase(),
      `${topic} in ${country}`.toLowerCase(),
      ...sensibleKeywords.slice(0, 12).map((item) => item.toLowerCase()),
    ])
  ).filter(Boolean);

  let slug = slugify(title);
  let n = 2;
  while (usedSlugs.has(slug) && slugify(tour.slug) !== slug) {
    slug = `${slugify(title).slice(0, 70)}-${n}`;
    n += 1;
  }
  usedSlugs.add(slug);

  const description = stripHyphensFromDescription(
    tour.description,
    focusKeyphrase,
    days,
    country,
    topic
  );
  const plainBody = description.replace(/<!--ETON_CONTENT:[\s\S]*?-->/, '').replace(/\s+/g, ' ').trim();
  const seoTitle = clip(`${title} | Eton Safaris`, 60);
  const metaDescription = clip(
    plainBody.includes(focusKeyphrase)
      ? plainBody
      : `${focusKeyphrase} on this ${days} day ${country} safari with Eton Safaris. ${plainBody}`,
    155
  );
  const image = String(tour.image_url || '').trim();
  const canonical = `${SITE_URL}/tours/${slug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: title,
    description: metaDescription,
    touristType: 'Safari traveler',
    itinerary: {
      '@type': 'ItemList',
      numberOfItems: days,
    },
    provider: {
      '@type': 'TravelAgency',
      name: 'Eton Safaris',
      url: SITE_URL,
    },
    image: image || undefined,
    url: canonical,
    _etonSeo: {
      canonical_url: canonical,
      robots_index: true,
      robots_follow: true,
      robots_advanced: [],
      breadcrumb_title: title,
      og_title: title,
      og_description: metaDescription,
      schema_type: 'TouristTrip',
    },
  };

  const payload = {
    title,
    slug,
    category,
    description,
    seo_title: seoTitle,
    meta_description: metaDescription,
    focus_keyword: focusKeyphrase,
    focus_keywords: focusKeywords,
    social_image_url: image || null,
    seo_schema: JSON.stringify(schema),
    updated_date: new Date().toISOString(),
  };

  jobs.push({ id: tour.id, payload, title, oldTitle: tour.title, focusKeyphrase });
}

if (dryRun) {
  for (const job of jobs.slice(0, 5)) {
    console.log('[dry-run]', job.oldTitle, '→', job.title, '|', job.focusKeyphrase);
  }
  console.log(JSON.stringify({ ok: true, dryRun: true, updated: jobs.length, failed: 0, skippedHandcrafted, total: tours.length }, null, 2));
  process.exit(0);
}

const CONCURRENCY = 8;
let cursor = 0;
async function worker() {
  while (cursor < jobs.length) {
    const index = cursor;
    cursor += 1;
    const job = jobs[index];
    const result = await updateTour(supabase, job.id, job.payload);
    if (!result.ok) {
      failed += 1;
      console.warn('Failed', job.id, result.error);
    } else {
      updated += 1;
      if (updated % 100 === 0) console.log(`… updated ${updated}/${jobs.length}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
if (droppedColumns.size) console.log('Dropped missing columns:', [...droppedColumns].join(', '));

console.log(
  JSON.stringify(
    {
      ok: true,
      dryRun,
      updated,
      failed,
      skippedHandcrafted,
      total: tours.length,
    },
    null,
    2
  )
);
