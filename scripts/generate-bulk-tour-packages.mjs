/**
 * Generate 100 original tour packages per CMS category (10 tours × durations 1–10 days).
 * Titles include a keyword from that category; day copy is original (not copied from SafariBookings).
 * Meal rule: full meals on non-final days; final day = Breakfast & Lunch only.
 * No cover images.
 *
 * Usage:
 *   node scripts/generate-bulk-tour-packages.mjs --dry-run
 *   node scripts/generate-bulk-tour-packages.mjs --country Uganda
 *   node scripts/generate-bulk-tour-packages.mjs --country Uganda --category "Uganda Gorilla Trekking Safaris"
 *   node scripts/generate-bulk-tour-packages.mjs
 */
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  EXCLUDES_TEMPLATE,
  INCLUDES_TEMPLATE,
  blueprintForCountry,
} from './lib/tour-package-blueprints.mjs';

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

function pick(list, seed) {
  if (!list?.length) return '';
  return list[Math.abs(seed) % list.length];
}

function uniqueSlug(base, used) {
  let slug = slugify(base) || `tour-${randomUUID().slice(0, 8)}`;
  let n = 2;
  while (used.has(slug)) {
    slug = `${slugify(base).slice(0, 70)}-${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
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

function embedContent(html, itineraries) {
  const payload = {
    blocks: [],
    itineraries,
    fields: {},
  };
  return `${html}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify(payload))}-->`;
}

function titleCaseKeyword(keyword) {
  return String(keyword || '')
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (['in', 'of', 'and', 'the', 'a', 'an', 'to', 'for'].includes(lower)) return lower;
      if (word.length <= 2) return word.toUpperCase() === word ? word : lower;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\b(In|Of|And|The|A|An|To|For)\b/g, (m) => m.toLowerCase());
}

/** Keep titles readable when a keyword already contains the country name. */
function cleanKeywordForTitle(keyword, country) {
  let text = String(keyword || '').trim();
  const countryRe = new RegExp(`\\b${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  text = text.replace(countryRe, ' ').replace(/\s+/g, ' ').trim();
  text = text.replace(/^(and|for|in|of|the)\s+/i, '').trim();
  return text || String(keyword || '').trim();
}

function mealPlanForDay(dayNumber, totalDays) {
  if (dayNumber === totalDays) return 'Breakfast & Lunch Only';
  return 'Breakfast, Lunch & Dinner';
}

function accommodationForDay(dayNumber, totalDays, lodge) {
  if (dayNumber === totalDays) return 'No accommodation';
  return lodge;
}

const OPENERS = [
  'Your journey opens with',
  'The day begins as',
  'This chapter of the safari starts when',
  'Travelers set out as',
  'After a calm briefing,',
  'With soft morning light across the landscape,',
  'Guests leave camp promptly as',
  'A measured start to the day unfolds when',
  'Following a short safety orientation,',
  'The private vehicle departs once',
];

const BRIDGES = [
  'Before long you continue toward',
  'The route then leads into',
  'Guides next introduce you to',
  'A scenic transfer carries you to',
  'Later in the day the focus shifts to',
  'By afternoon the program moves into',
  'After a short refreshment stop you reach',
  'Your driver then links the next segment toward',
  'The itinerary pivots naturally into',
  'From there the experience deepens around',
];

const CLOSERS = [
  'Evening settles with time to rest and prepare for the next chapter.',
  'As dusk arrives, the lodge becomes a quiet base for stories from the trail.',
  'Nightfall brings a restorative pause under clear African skies.',
  'You end the day reviewing wildlife highlights with your guide over dinner.',
  'The schedule closes with a relaxed return and an early night ahead.',
  'Dinner is timed for an early start tomorrow, keeping energy high for the trail.',
  'Guests wind down with optional briefings on tomorrow’s conservation notes.',
  'The lodge team settles you in while your guide confirms the next morning’s plan.',
];

const ACTIVITY_VERBS = [
  'following ranger cues for',
  'focusing patiently on',
  'building photographic opportunities around',
  'pairing interpretive commentary with',
  'balancing comfort stops and',
  'prioritizing low-impact access for',
];

function dayDescription({ country, park, activity, lodge, dayNumber, totalDays, gateway, variant }) {
  const opener = pick(OPENERS, variant + dayNumber * 3);
  const bridge = pick(BRIDGES, variant * 5 + dayNumber);
  const closer = pick(CLOSERS, variant + dayNumber * 7);
  const verb = pick(ACTIVITY_VERBS, variant * 11 + dayNumber);
  if (dayNumber === 1 && totalDays === 1) {
    return `${opener} a compact departure from ${gateway} into ${park}. Your Eton Safaris guide coordinates ${activity}, ${verb} the best available window while protecting return timing. Meals are sequenced for a full-day pace, and the outing concludes with a transfer back toward ${gateway} after lunch. ${closer}`;
  }
  if (dayNumber === 1) {
    return `${opener} a transfer from ${gateway}, easing into ${country}'s landscapes while your guide outlines the coming days. ${bridge} ${park}, where ${activity} sets the tone for this privately guided departure. Check-in at ${lodge} follows, with time to settle before dinner and a clear briefing on tomorrow's pace. ${closer}`;
  }
  if (dayNumber === totalDays) {
    return `${opener} a final outing around ${park}, keeping the schedule flexible so highlights of ${activity} can be enjoyed without rush. ${bridge} your outbound transfer route, with packed timing that protects flight or border connections. After a light midday meal, the safari concludes as your driver returns you toward ${gateway}. ${closer}`;
  }
  return `${opener} dedicated time in ${park}. Rangers and your private guide coordinate ${activity}, ${verb} wildlife movement through the day. ${bridge} ${lodge} for hot meals, a short rest, and optional evening discussion of conservation notes relevant to the area. ${closer}`;
}

function overviewDescription({ country, category, days, keyword, park, activity, variant }) {
  const angles = [
    `This ${days}-day ${country} itinerary is crafted for travelers seeking ${keyword} within a clear, paced safari framework. Anchored around ${park}, the program balances guided ${activity} with comfortable full-board pacing and private road support from Eton Safaris.`,
    `Built for guests comparing ${keyword} options, this ${days}-day route centers on ${park} and keeps daily logistics transparent. Guided ${activity} sits beside reliable lodge stays and meal timing designed for early park access.`,
    `Eton Safaris designed this ${days}-day ${country} package so ${keyword} searches lead to a usable day-by-day plan—not vague marketing copy. Expect focused time at ${park}, professional guiding for ${activity}, and meal coverage that matches each travel day.`,
    `If you want a practical ${keyword} holiday in ${country}, this ${days}-day circuit uses ${park} as the wildlife anchor and sequences ${activity} with transfer buffers that protect comfort and sightings.`,
  ];
  const lead = pick(angles, variant + days);
  return `${lead} Each day is written for search clarity and guest usability—precise park context, transparent meal timing, and lodge stays that match the route—so visitors can compare options quickly and book with confidence. The experience suits first-time visitors and returning safari guests who want authentic wildlife access without rushed transfers.`;
}

function highlightLines({ country, park, activity, days, keyword, lodge }) {
  return [
    `${days}-day ${keyword} focus across ${country}`,
    `Guided time in ${park}`,
    `Signature activity: ${activity}`,
    `Private driver-guide and road support`,
    `Lodge base at ${lodge} (route dependent)`,
    `Meal plan aligned to daily safari timing`,
    `Transparent inclusions for park fees and listed activities`,
    `Designed for strong on-page clarity and itinerary scannability`,
  ].join('\n');
}

function buildTour({
  country,
  category,
  days,
  variant,
  keyword,
  blueprint,
  usedSlugs,
}) {
  const park = pick(blueprint.parks, variant * 11 + days);
  const activity = pick(blueprint.activities, variant * 13 + days * 3);
  const lodge = pick(blueprint.lodges, variant * 17 + days);
  const gateway = pick(blueprint.gateways, variant + days);
  const coreKeyword = cleanKeywordForTitle(keyword, country);
  const keywordTitle = titleCaseKeyword(coreKeyword);
  const parkShort = park
    .replace(/National Park|National Reserve|Conservancy|Forest Reserve/gi, '')
    .trim();
  const titlePattern = (variant + days) % 5;
  const hasSafariWord = /\bsafaris?\b/i.test(keywordTitle);
  let title;
  if (titlePattern === 0) {
    title = hasSafariWord
      ? `${days} Day ${keywordTitle} In ${parkShort}`
      : `${days} Day ${keywordTitle} Safari In ${parkShort}`;
  } else if (titlePattern === 1) {
    title = `${days} Day ${country} ${keywordTitle} Experience`;
  } else if (titlePattern === 2) {
    title = hasSafariWord
      ? `${days} Day ${keywordTitle} Journey`
      : `${days} Day ${keywordTitle} Journey In ${country}`;
  } else if (titlePattern === 3) {
    title = `${days} Day ${keywordTitle} Adventure — ${parkShort}`;
  } else {
    title = hasSafariWord
      ? `${days} Day ${keywordTitle} Package In ${country}`
      : `${days} Day ${keywordTitle} Safari Package In ${country}`;
  }
  title = title.replace(/\s+/g, ' ').replace(/\s+—\s+/g, ' — ').trim();
  const slug = uniqueSlug(title, usedSlugs);
  const itineraries = [];
  for (let day = 1; day <= days; day += 1) {
    const dayLodge = pick(blueprint.lodges, variant * 23 + day * days);
    itineraries.push({
      day: String(day),
      title:
        day === 1
          ? `Arrival Transfer & Orientation Toward ${park}`
          : day === days
            ? `Final Activity Window & Departure via ${gateway}`
            : `${park} Focus Day — ${pick(blueprint.activities, variant + day * 9)}`,
      description: dayDescription({
        country,
        park,
        activity: pick(blueprint.activities, variant + day * 5),
        lodge: dayLodge,
        dayNumber: day,
        totalDays: days,
        gateway,
        variant,
      }),
      mealPlan: mealPlanForDay(day, days),
      accommodationPlan: accommodationForDay(day, days, dayLodge),
    });
  }

  const cleanDescription = overviewDescription({
    country,
    category,
    days,
    keyword,
    park,
    activity,
    variant,
  });

  return {
    id: randomUUID(),
    title,
    slug,
    country,
    category,
    duration_days: days,
    duration_nights: Math.max(days - 1, 0),
    description: embedContent(cleanDescription, itineraries),
    itinerary: JSON.stringify(itineraries),
    highlights: highlightLines({ country, park, activity, days, keyword, lodge }),
    price_includes: INCLUDES_TEMPLATE,
    price_excludes: EXCLUDES_TEMPLATE,
    image_url: '',
    seo_title: `${title} | Eton Safaris`,
    meta_description: cleanDescription.slice(0, 155),
    focus_keyword: keyword,
    focus_keywords: [keyword, `${country} safari`, category],
    published_at: new Date().toISOString(),
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    is_featured: false,
    is_popular: false,
    show_on_landing: false,
  };
}

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i);
  return match?.[1] || null;
}

async function fetchAllRows(supabase, table, columns) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(columns).range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function insertTour(supabase, payload) {
  let current = { ...payload };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await supabase.from('tours').insert(current).select('id').limit(1);
    if (!error) return { ok: true, id: data?.[0]?.id };
    const message = error.message || '';
    const column = missingColumn(message);
    if (column && column in current) {
      delete current[column];
      continue;
    }
    if (Array.isArray(current.focus_keywords) && /invalid|json|array/i.test(message)) {
      current = { ...current, focus_keywords: JSON.stringify(current.focus_keywords) };
      continue;
    }
    // Transient Cloudflare / Supabase gateway errors
    if (/520|521|522|523|524|502|503|504|fetch failed|ECONNRESET|ETIMEDOUT|<!DOCTYPE html>/i.test(message) && attempt < 8) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    return { ok: false, error: message };
  }
  return { ok: false, error: 'Insert failed after column fallbacks' };
}

function parseArgs(argv) {
  const args = { dryRun: false, country: '', category: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    if (token === '--country') args.country = String(argv[++i] || '').trim();
    if (token === '--category') args.category = String(argv[++i] || '').trim();
  }
  return args;
}

loadEnv();
const args = parseArgs(process.argv.slice(2));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

let categories;
let existingTours;
let keywordRows;
try {
  [categories, existingTours, keywordRows] = await Promise.all([
    fetchAllRows(supabase, 'categories', 'id,name,slug,country'),
    fetchAllRows(supabase, 'tours', 'id,title,slug,country,category'),
    fetchAllRows(supabase, 'keywords', 'country,category,keywords'),
  ]);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

const usedSlugs = new Set(
  (existingTours || [])
    .map((row) => slugify(row.slug || row.title || ''))
    .filter(Boolean)
);

const keywordMap = new Map();
for (const row of keywordRows || []) {
  const keyName = `${String(row.country || '').trim().toLowerCase()}||${String(row.category || '').trim().toLowerCase()}`;
  keywordMap.set(keyName, parseKeywordList(row.keywords));
}

let scopes = (categories || []).map((row) => ({
  country: String(row.country || '').trim(),
  category: String(row.name || '').trim(),
  slug: String(row.slug || '').trim(),
}));

// Prefer trimmed country names; skip blank category rows.
scopes = scopes.filter((scope) => scope.country && scope.category);

if (args.country) {
  scopes = scopes.filter((scope) => scope.country.toLowerCase() === args.country.toLowerCase());
}
if (args.category) {
  scopes = scopes.filter((scope) => scope.category.toLowerCase() === args.category.toLowerCase());
}

if (!scopes.length) {
  console.error('No matching categories found.');
  process.exit(1);
}

console.log(`Scopes to fill: ${scopes.length}`);
console.log(`Existing tours: ${(existingTours || []).length}`);
console.log(`Dry run: ${args.dryRun}`);

let created = 0;
let skipped = 0;
let failed = 0;

for (const scope of scopes) {
  const blueprint = blueprintForCountry(scope.country);
  const keyName = `${scope.country.toLowerCase()}||${scope.category.toLowerCase()}`;
  let keywords = keywordMap.get(keyName) || [];
  if (keywords.length < 10) {
    keywords = [
      ...keywords,
      `${scope.country} safari`,
      `${scope.country} wildlife`,
      `${scope.country} tour`,
      `${scope.country} holiday`,
      scope.category.replace(scope.country, '').trim() || 'safari package',
      `${scope.country} adventure`,
      `${scope.country} itinerary`,
      `best ${scope.country} safari`,
      `${scope.country} lodges`,
      `${scope.country} game drive`,
    ];
  }

  const existingForScope = (existingTours || []).filter(
    (row) =>
      String(row.country || '').toLowerCase() === scope.country.toLowerCase() &&
      String(row.category || '').toLowerCase() === scope.category.toLowerCase()
  ).length;

  console.log(`\n=== ${scope.country} / ${scope.category} (existing ${existingForScope}) ===`);

  const targetPerCategory = 100;
  if (existingForScope >= targetPerCategory) {
    console.log(`Already at/above ${targetPerCategory}; skipping.`);
    skipped += targetPerCategory;
    continue;
  }

  let createdForScope = 0;

  dayLoop: for (let days = 1; days <= 10; days += 1) {
    for (let variant = 1; variant <= 10; variant += 1) {
      if (existingForScope + createdForScope >= targetPerCategory) break dayLoop;

      const keyword = pick(keywords, days * 100 + variant * 7 + scope.category.length);
      const tour = buildTour({
        country: scope.country,
        category: scope.category,
        days,
        variant,
        keyword,
        blueprint,
        usedSlugs,
      });

      // Skip if an identically titled package already exists for this scope.
      const already = (existingTours || []).some(
        (row) =>
          String(row.title || '').toLowerCase() === tour.title.toLowerCase() ||
          slugify(row.slug || '') === tour.slug
      );
      if (already) {
        skipped += 1;
        continue;
      }

      if (args.dryRun) {
        created += 1;
        createdForScope += 1;
        if (created <= 3) console.log('[dry-run sample]', tour.title, '→', tour.slug);
        continue;
      }

      const result = await insertTour(supabase, tour);
      if (!result.ok) {
        failed += 1;
        console.warn('Failed:', tour.title, result.error);
      } else {
        created += 1;
        createdForScope += 1;
        existingTours.push({
          id: result.id,
          title: tour.title,
          slug: tour.slug,
          country: tour.country,
          category: tour.category,
        });
        if (created % 25 === 0) console.log(`… created ${created}`);
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      dryRun: args.dryRun,
      scopes: scopes.length,
      created,
      skipped,
      failed,
      expectedMax: scopes.length * 100,
    },
    null,
    2
  )
);
