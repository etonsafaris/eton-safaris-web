/**
 * Conservative tour-title repair:
 * - gorilla trekking only on gorilla parks / gorilla countries
 * - do not name a park that cannot host the activity in the title
 * - collapse doubled words and trailing uniqueness numbers
 * - make titles unique per country with style words
 *
 * Does not flatten every tour onto one default park.
 *
 * Usage: node scripts/fix-tour-title-resources.mjs [--dry-run]
 */
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

const STYLES = [
  'Classic',
  'Private',
  'Family',
  'Luxury',
  'Guided',
  'Signature',
  'Discovery',
  'Expedition',
  'Tailor-Made',
  'Premium',
  'Intimate',
  'Scenic',
];

const GORILLA_COUNTRIES = new Set(['uganda', 'rwanda', 'dr congo', 'drc', 'congo']);

const PARKS = [
  { test: /bwindi/, name: 'Bwindi Impenetrable', activity: 'Gorilla Trekking', countries: ['uganda'], gorilla: true },
  { test: /mgahinga/, name: 'Mgahinga Gorilla', activity: 'Gorilla Trekking', countries: ['uganda'], gorilla: true },
  { test: /volcanoes/, name: 'Volcanoes', activity: 'Gorilla Trekking', countries: ['rwanda'], gorilla: true },
  { test: /virunga/, name: 'Virunga', activity: 'Gorilla Trekking', countries: ['dr congo', 'drc', 'congo'], gorilla: true },
  { test: /kibale/, name: 'Kibale', activity: 'Chimpanzee Tracking', countries: ['uganda'] },
  { test: /queen elizabeth/, name: 'Queen Elizabeth', activity: 'Wildlife Safari', countries: ['uganda'] },
  { test: /murchison/, name: 'Murchison Falls', activity: 'Wildlife Safari', countries: ['uganda'] },
  { test: /lake mburo/, name: 'Lake Mburo', activity: 'Wildlife Safari', countries: ['uganda'] },
  { test: /kidepo/, name: 'Kidepo Valley', activity: 'Wildlife Safari', countries: ['uganda'] },
  { test: /rwenzori/, name: 'Rwenzori', activity: 'Mountain Trek', countries: ['uganda'] },
  { test: /elgon/, name: 'Mount Elgon', activity: 'Mountain Trek', countries: ['uganda'] },
  { test: /semuliki/, name: 'Semuliki', activity: 'Wildlife Safari', countries: ['uganda'] },
  { test: /nyungwe/, name: 'Nyungwe', activity: 'Chimpanzee Tracking', countries: ['rwanda'] },
  { test: /akagera/, name: 'Akagera', activity: 'Wildlife Safari', countries: ['rwanda'] },
  { test: /masai mara|maasai mara/, name: 'Masai Mara', activity: 'Wildlife Safari', countries: ['kenya'] },
  { test: /amboseli/, name: 'Amboseli', activity: 'Wildlife Safari', countries: ['kenya'] },
  { test: /tsavo/, name: 'Tsavo', activity: 'Wildlife Safari', countries: ['kenya'] },
  { test: /samburu/, name: 'Samburu', activity: 'Wildlife Safari', countries: ['kenya'] },
  { test: /nakuru/, name: 'Lake Nakuru', activity: 'Wildlife Safari', countries: ['kenya'] },
  { test: /serengeti/, name: 'Serengeti', activity: 'Wildlife Safari', countries: ['tanzania'] },
  { test: /ngorongoro/, name: 'Ngorongoro', activity: 'Wildlife Safari', countries: ['tanzania'] },
  { test: /tarangire/, name: 'Tarangire', activity: 'Wildlife Safari', countries: ['tanzania'] },
  { test: /manyara/, name: 'Lake Manyara', activity: 'Wildlife Safari', countries: ['tanzania'] },
  { test: /kilimanjaro/, name: 'Kilimanjaro', activity: 'Kilimanjaro Climb', countries: ['tanzania'] },
  { test: /zanzibar/, name: 'Zanzibar', activity: 'Beach Holiday', countries: ['tanzania'] },
  { test: /gombe|mahale/, name: 'Gombe', activity: 'Chimpanzee Tracking', countries: ['tanzania'] },
];

const GORILLA_PARKS = {
  uganda: ['Bwindi Impenetrable', 'Mgahinga Gorilla'],
  rwanda: ['Volcanoes'],
  'dr congo': ['Virunga'],
  drc: ['Virunga'],
  congo: ['Virunga'],
};

const DEFAULT_WILDLIFE = {
  uganda: 'Queen Elizabeth',
  kenya: 'Masai Mara',
  tanzania: 'Serengeti',
  rwanda: 'Akagera',
};

function slugCountry(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/democratic republic of the congo|democratic republic of congo/g, 'dr congo');
}

function cleanTitle(value) {
  let text = String(value || '').replace(/\s+/g, ' ').trim();
  text = text.replace(/\b(\w+)\s+\1\b/gi, '$1');
  text = text.replace(/\bin in\b/gi, 'in');
  text = text.replace(/\bsafari safari\b/gi, 'Safari');
  text = text.replace(/\s+Option\s+\d+$/i, '');
  text = text.replace(/\s+\d+$/, '');
  text = text.replace(/\s+in\s*$/i, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function daysOf(title, tour) {
  const fromTour = Number(tour.duration_days || 0);
  if (fromTour > 0) return fromTour;
  const match = String(title).match(/^(\d+)\s*Day/i);
  return match ? Number(match[1]) : 0;
}

function parkFromTitle(title) {
  const text = String(title || '').toLowerCase();
  return PARKS.find((row) => row.test.test(text)) || null;
}

function gorillaCategory(tour) {
  return /gorilla/i.test(String(tour.category || ''));
}

function buildTitle(days, style, activity, place) {
  const dayBit = days > 0 ? `${days} Day ` : '';
  const styleBit = style ? `${style} ` : '';
  return cleanTitle(`${dayBit}${styleBit}${activity} in ${place}`);
}

function uniqueTitle(base, countryKey, used) {
  if (!used.has(`${countryKey}||${base.toLowerCase()}`)) return base;
  for (const style of STYLES) {
    const next = base.replace(/^(\d+\s+Day\s+)/i, `$1${style} `);
    if (!used.has(`${countryKey}||${next.toLowerCase()}`)) return next;
  }
  let n = 2;
  let fallback = `${base} Option ${n}`;
  while (used.has(`${countryKey}||${fallback.toLowerCase()}`)) {
    n += 1;
    fallback = `${base} Option ${n}`;
  }
  return fallback;
}

function alignTitle(tour, index) {
  const country = String(tour.country || '').trim();
  const countryKey = slugCountry(country);
  const current = cleanTitle(tour.title || '');
  const days = daysOf(current, tour);
  const named = parkFromTitle(current);
  const titleHasGorilla = /gorilla/i.test(current);
  const gorillaCat = gorillaCategory(tour);
  const gorillaParks = GORILLA_PARKS[countryKey] || ['Bwindi Impenetrable'];

  if (titleHasGorilla && !GORILLA_COUNTRIES.has(countryKey)) {
    const place = named && named.countries.includes(countryKey) ? named.name : DEFAULT_WILDLIFE[countryKey] || country;
    const activity = named && !named.gorilla ? named.activity : 'Wildlife Safari';
    return buildTitle(days, '', activity, place);
  }

  if ((titleHasGorilla || gorillaCat) && GORILLA_COUNTRIES.has(countryKey)) {
    if (named?.gorilla && named.countries.includes(countryKey)) {
      return buildTitle(days, '', 'Gorilla Trekking', named.name);
    }
    if (named && !named.gorilla) {
      if (gorillaCat) {
        return buildTitle(days, '', 'Gorilla Trekking', gorillaParks[index % gorillaParks.length]);
      }
      return buildTitle(days, '', named.activity, named.countries.includes(countryKey) ? named.name : DEFAULT_WILDLIFE[countryKey] || country);
    }
    return buildTitle(days, '', 'Gorilla Trekking', gorillaParks[index % gorillaParks.length]);
  }

  if (named && named.gorilla && named.countries.includes(countryKey) && !gorillaCat && !titleHasGorilla) {
    return current;
  }

  if (named && !named.countries.includes(countryKey)) {
    const place = DEFAULT_WILDLIFE[countryKey] || country;
    return buildTitle(days, '', named.gorilla ? 'Wildlife Safari' : named.activity, place);
  }

  return current;
}

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function fetchAll() {
  const rows = [];
  const pageSize = 200;
  for (let from = 0, attempt = 0; from < 20000; ) {
    const { data, error } = await supabase
      .from('tours')
      .select('id,title,country,category,duration_days')
      .range(from, from + pageSize - 1);
    if (error) {
      if (attempt < 4) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        continue;
      }
      throw error;
    }
    attempt = 0;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function updateTitle(id, title, attempt = 0) {
  const { error } = await supabase.from('tours').update({ title }).eq('id', id);
  if (!error) return true;
  if (attempt < 3 && /fetch failed|network|timeout/i.test(error.message || '')) {
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    return updateTitle(id, title, attempt + 1);
  }
  console.error(id, error.message || error);
  return false;
}

const tours = await fetchAll();
const used = new Set();
const pending = [];

for (let i = 0; i < tours.length; i += 1) {
  const tour = tours[i];
  const countryKey = slugCountry(tour.country);
  const current = String(tour.title || '').trim();
  if (!current) continue;
  const aligned = cleanTitle(alignTitle(tour, i));
  const unique = uniqueTitle(aligned, countryKey, used);
  used.add(`${countryKey}||${unique.toLowerCase()}`);
  if (unique === current) continue;
  pending.push({ id: tour.id, from: current, to: unique, country: tour.country });
}

console.log(`Will update ${pending.length} of ${tours.length} titles.`);
if (dryRun) {
  pending.slice(0, 50).forEach((row) => console.log(`${row.country}: "${row.from}" -> "${row.to}"`));
  process.exit(0);
}

let updated = 0;
let failed = 0;
const chunkSize = 12;
for (let i = 0; i < pending.length; i += chunkSize) {
  const chunk = pending.slice(i, i + chunkSize);
  const results = await Promise.all(chunk.map((row) => updateTitle(row.id, row.to)));
  results.forEach((ok) => {
    if (ok) updated += 1;
    else failed += 1;
  });
  if ((i / chunkSize) % 10 === 0) console.log(`Updated ${updated}...`);
}

console.log(`Done. updated=${updated} failed=${failed}`);
