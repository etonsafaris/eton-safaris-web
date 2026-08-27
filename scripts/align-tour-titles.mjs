/**
 * Align tour titles to real destination resources and remove duplicate titles.
 *
 * - Gorilla trekking titles stay in Uganda, Rwanda, DR Congo only
 * - Migration titles stay in Kenya / Tanzania
 * - Do not name a park or country that the tour's destination does not have
 * - Duplicate titles in the same country become unique
 *
 * Usage:
 *   node scripts/align-tour-titles.mjs --dry-run
 *   node scripts/align-tour-titles.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { COUNTRY_BLUEPRINTS } from './lib/tour-package-blueprints.mjs';

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

function slugifyCountry(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && ['in', 'of', 'and', 'the', 'a', 'an', 'to', 'for', 'on'].includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function daysOf(tour) {
  const n = Number(tour.duration_days || tour.days || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const THEMES = [
  {
    id: 'gorilla',
    test: /gorilla/,
    allow: ['uganda', 'rwanda', 'dr-congo', 'congo', 'democratic-republic-of-the-congo'],
  },
  {
    id: 'chimpanzee',
    test: /chimpanzee|chimp/,
    allow: ['uganda', 'rwanda', 'tanzania'],
  },
  {
    id: 'migration',
    test: /migration|wildebeest/,
    allow: ['kenya', 'tanzania'],
  },
  {
    id: 'kilimanjaro',
    test: /kilimanjaro/,
    allow: ['tanzania'],
  },
  {
    id: 'rwenzori',
    test: /rwenzori/,
    allow: ['uganda'],
  },
  {
    id: 'zanzibar',
    test: /zanzibar/,
    allow: ['tanzania'],
  },
  {
    id: 'okavango',
    test: /okavango/,
    allow: ['botswana'],
  },
  {
    id: 'kruger',
    test: /kruger/,
    allow: ['south-africa'],
  },
  {
    id: 'victoria-falls',
    test: /victoria falls|vic falls/,
    allow: ['zambia', 'zimbabwe'],
  },
  {
    id: 'pyramids',
    test: /pyramid|nile cruise|luxor|cairo/,
    allow: ['egypt'],
  },
  {
    id: 'masai-mara',
    test: /masai mara|maasai mara/,
    allow: ['kenya'],
  },
  {
    id: 'serengeti',
    test: /serengeti|ngorongoro/,
    allow: ['tanzania'],
  },
  {
    id: 'bwindi',
    test: /bwindi|mgahinga/,
    allow: ['uganda'],
  },
  {
    id: 'volcanoes',
    test: /volcanoes national/,
    allow: ['rwanda'],
  },
  {
    id: 'virunga',
    test: /virunga/,
    allow: ['dr-congo', 'congo'],
  },
];

function defaultTopic(country, category, seed) {
  const blueprint = COUNTRY_BLUEPRINTS[country] || COUNTRY_BLUEPRINTS[Object.keys(COUNTRY_BLUEPRINTS)[0]];
  const cat = String(category || '').toLowerCase();
  if (/gorilla/.test(cat) && ['Uganda', 'Rwanda', 'DR Congo'].includes(country)) return 'Gorilla Trekking';
  if (/chimp/.test(cat) && ['Uganda', 'Rwanda', 'Tanzania'].includes(country)) return 'Chimpanzee Tracking';
  if (/beach|island/.test(cat)) return 'Beach Holiday';
  if (/bird/.test(cat)) return 'Birding Safari';
  if (/climb|mountain/.test(cat)) return country === 'Tanzania' ? 'Kilimanjaro Climb' : country === 'Uganda' ? 'Rwenzori Trek' : 'Wildlife Safari';
  if (/culture/.test(cat)) return 'Cultural Tour';
  const activity = blueprint?.activities?.[Math.abs(seed) % (blueprint.activities.length || 1)] || 'wildlife safari';
  if (/gorilla/.test(activity) && !['Uganda', 'Rwanda', 'DR Congo'].includes(country)) {
    return 'Wildlife Safari';
  }
  return titleCase(activity.replace(/option$/i, '').trim()) || 'Wildlife Safari';
}

function parkFor(country, seed) {
  const blueprint = COUNTRY_BLUEPRINTS[country];
  const parks = blueprint?.parks || [];
  if (!parks.length) return country;
  return parks[Math.abs(seed) % parks.length];
}

function shortPark(name) {
  return String(name || '')
    .replace(/\b(National Park|National Reserve|Conservation Area|Game Reserve|Forest Reserve|Marine Park|Conservancy)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTitle(days, country, topic, park, variant) {
  const parkShort = shortPark(park) || country;
  const phrase = topic.replace(new RegExp(`\\b${country}\\b`, 'ig'), '').replace(/\s+/g, ' ').trim();
  const dayBit = days > 0 ? `${days} Day ` : '';
  const pattern = Math.abs(variant) % 4;
  if (pattern === 0) return `${dayBit}${phrase} in ${parkShort}`.replace(/\s+/g, ' ').trim();
  if (pattern === 1) return `${dayBit}${country} ${phrase}`.replace(/\s+/g, ' ').trim();
  if (pattern === 2) return `${dayBit}${phrase} Safari in ${country}`.replace(/\s+/g, ' ').trim();
  return `${dayBit}Classic ${phrase} in ${parkShort}`.replace(/\s+/g, ' ').trim();
}

function needsRewrite(title, countrySlug) {
  const text = String(title || '').toLowerCase();
  for (const theme of THEMES) {
    if (theme.test.test(text) && !theme.allow.includes(countrySlug)) return theme.id;
  }
  return '';
}

function missingColumn(message) {
  const match =
    String(message || '').match(/Could not find the '([^']+)' column/i) ||
    String(message || '').match(/column ["'`]([^"'`]+)["'`]/i);
  return match?.[1] || null;
}

async function fetchAll(supabase, table, columns) {
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
const dryRun = process.argv.includes('--dry-run');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const tours = await fetchAll(supabase, 'tours', 'id,title,country,category,duration_days');
console.log(`Loaded ${tours.length} tours (dryRun=${dryRun})`);

const used = new Map();
function remember(country, title, id) {
  const key = `${country.toLowerCase()}||${title.toLowerCase()}`;
  const set = used.get(key) || new Set();
  set.add(id);
  used.set(key, set);
}

for (const tour of tours) {
  remember(String(tour.country || ''), String(tour.title || ''), String(tour.id));
}

let updated = 0;
let skipped = 0;
let failed = 0;
const dropped = new Set();

for (let i = 0; i < tours.length; i += 1) {
  const tour = tours[i];
  const country = String(tour.country || '').trim();
  const countrySlug = slugifyCountry(country);
  const current = String(tour.title || '').replace(/\s+/g, ' ').trim();
  if (!country || !current) {
    skipped += 1;
    continue;
  }

  const mismatch = needsRewrite(current, countrySlug);
  const key = `${country.toLowerCase()}||${current.toLowerCase()}`;
  const dup = (used.get(key) || new Set()).size > 1;
  if (!mismatch && !dup) {
    skipped += 1;
    continue;
  }

  const days = daysOf(tour);
  const topic = mismatch
    ? defaultTopic(country, tour.category, i)
    : titleCase(current.replace(/^\d+\s*days?\s*/i, '').replace(/\s+/g, ' ').trim()) || defaultTopic(country, tour.category, i);
  let next = buildTitle(days, country, topic, parkFor(country, i), i);
  let guard = 0;
  while ((used.get(`${country.toLowerCase()}||${next.toLowerCase()}`) || new Set()).size && guard < 8) {
    next = buildTitle(days, country, topic, parkFor(country, i + guard + 1), i + guard + 1);
    guard += 1;
  }
  if (next.toLowerCase() === current.toLowerCase()) {
    skipped += 1;
    continue;
  }

  if (dryRun) {
    console.log(`${country}: "${current}" -> "${next}"${mismatch ? ` [${mismatch}]` : ' [dup]'}`);
    updated += 1;
    continue;
  }

  const payload = { title: next, updated_date: new Date().toISOString() };
  for (const col of dropped) delete payload[col];
  let currentPayload = { ...payload };
  let ok = false;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from('tours').update(currentPayload).eq('id', tour.id);
    if (!error) {
      ok = true;
      break;
    }
    const column = missingColumn(error.message || '');
    if (column && column in currentPayload) {
      dropped.add(column);
      delete currentPayload[column];
      continue;
    }
    if (/520|502|503|504|fetch failed|timeout/i.test(error.message || '')) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    console.error(`Fail ${tour.id}: ${error.message}`);
    break;
  }
  if (ok) {
    const oldKey = `${country.toLowerCase()}||${current.toLowerCase()}`;
    const oldSet = used.get(oldKey);
    if (oldSet) oldSet.delete(String(tour.id));
    remember(country, next, String(tour.id));
    updated += 1;
    if (updated % 100 === 0) console.log(`Updated ${updated}...`);
  } else {
    failed += 1;
  }
}

console.log(`Done. updated=${updated} skipped=${skipped} failed=${failed}`);
