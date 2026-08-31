/**
 * Seed 10 accommodations per national park.
 * Mix covers all 8 accommodation types; extras favor lodge + tented camp.
 * Each overview/block paragraph includes exactly one country keyword → tour package link.
 *
 * Usage:
 *   node scripts/seed-park-accommodations.mjs --dry-run
 *   node scripts/seed-park-accommodations.mjs
 *   node scripts/seed-park-accommodations.mjs --country Uganda
 *   node scripts/seed-park-accommodations.mjs --limit-parks 5
 */
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';

const SITE_URL = 'https://etonsafaris.com';

/** All module types — every park's set of 10 must include each at least once where possible. */
const ALL_TYPES = [
  'Luxury Lodge',
  'Mid-range Lodge',
  'Luxury Tented Camp',
  'Mid-Range Tented Camp',
  'Luxury Hotel',
  'Mid-Range Hotel',
  'Luxury Banda',
  'Mid-Range Banda',
];

/** Slot plan: 8 unique types + 2 popular safari extras. All 10 sit inside the park. */
const SLOT_PLAN = [
  { type: 'Luxury Lodge', placement: 'inside', label: 'Luxury Lodge' },
  { type: 'Mid-range Lodge', placement: 'inside', label: 'Mid-range Lodge' },
  { type: 'Luxury Tented Camp', placement: 'inside', label: 'Luxury Tented Camp' },
  { type: 'Mid-Range Tented Camp', placement: 'inside', label: 'Mid-Range Tented Camp' },
  { type: 'Luxury Hotel', placement: 'inside', label: 'Luxury Hotel' },
  { type: 'Mid-Range Hotel', placement: 'inside', label: 'Mid-Range Hotel' },
  { type: 'Luxury Banda', placement: 'inside', label: 'Luxury Banda' },
  { type: 'Mid-Range Banda', placement: 'inside', label: 'Mid-Range Banda' },
  { type: 'Luxury Lodge', placement: 'inside', label: 'Luxury Lodge' },
  { type: 'Mid-Range Tented Camp', placement: 'inside', label: 'Mid-Range Tented Camp' },
];

const STYLE_WORDS = [
  'River',
  'Savannah',
  'Forest',
  'Hilltop',
  'Horizon',
  'Baobab',
  'Mist',
  'Sunset',
  'Valley',
  'Lagoon',
  'Canyon',
  'Plateau',
  'Oasis',
  'Crest',
  'Trail',
];

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadRealCatalog() {
  const dir = resolve(process.cwd(), 'data');
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.startsWith('real-park-accommodations-') && f.endsWith('.json'));
  const rows = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    if (Array.isArray(parsed)) rows.push(...parsed);
  }
  return rows.filter((row) => row?.name && row?.national_park && row?.country);
}

function parkNamesMatch(a, b) {
  const left = slugify(a).replace(/-national-park|-national-reserve|-game-reserve|-conservation-area|-nature-reserve|-protected-area|-protectorate|-wildlife-reserve|-marine-national-park|-transfrontier-park/g, '');
  const right = slugify(b).replace(/-national-park|-national-reserve|-game-reserve|-conservation-area|-nature-reserve|-protected-area|-protectorate|-wildlife-reserve|-marine-national-park|-transfrontier-park/g, '');
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function parseKeywords(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* fall through */
  }
  return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
}

async function fetchAll(supabase, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data, error } = await supabase.from(table).select(columns).range(from, from + 499);
      if (!error) {
        rows.push(...(data || []));
        if (!data || data.length < 500) return rows;
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

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i);
  return match?.[1] || null;
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
    .filter((item) => item.length >= 6 && item.length <= 42)
    .filter((item) => !/\d+\s*day/i.test(item));
  const unique = [];
  for (const item of merged) {
    if (!unique.some((u) => u.toLowerCase() === item.toLowerCase())) unique.push(item);
    if (unique.length >= 24) break;
  }
  return unique.length ? unique : defaults;
}

function pickTourLinks(tours, country, count = 12) {
  const pool = tours.filter((t) => String(t.country || '').trim().toLowerCase() === country.toLowerCase());
  const links = [];
  for (let i = 0; i < Math.max(pool.length, count) && links.length < count; i += 1) {
    if (!pool.length) break;
    const tour = pool[(i * 5) % pool.length];
    const slug = String(tour.slug || '').trim() || slugify(tour.title);
    if (!slug || links.some((l) => l.slug === slug)) continue;
    links.push({ slug, title: String(tour.title || slug) });
  }
  return links;
}

/** One tour keyword link per paragraph — woven into the copy, not a repeated boilerplate line. */
function paragraphWithOneLink(text, phrases, tourLinks, index) {
  const phrase = phrases[index % phrases.length];
  const tour = tourLinks[index % Math.max(tourLinks.length, 1)];
  let html = `<p>${text}`;
  if (phrase && tour?.slug) {
    html += ` Eton Safaris can include a <a href="/tours/${tour.slug}">${phrase}</a> when building your route.`;
  }
  html += `</p>`;
  return html;
}

function placementCopy(placement, parkName) {
  if (placement === 'inside') {
    return `inside ${parkName}, so game drives and walks start close to your room`;
  }
  if (placement === 'edge') {
    return `on the edge of ${parkName}, balancing park access with a quieter overnight base`;
  }
  return `just outside ${parkName} in a practical gateway area for early park entries and flexible evenings`;
}

function typeNoun(type) {
  if (/tented/i.test(type)) return 'tented camp';
  if (/hotel/i.test(type)) return 'hotel';
  if (/banda/i.test(type)) return 'banda stay';
  return 'lodge';
}

function stayName(parkName, slot, index) {
  if (slot.realName) return slot.realName;
  const short = parkName
    .replace(/\b(National Park|National Reserve|Conservation Area|Game Reserve|Nature Reserve|Protected Area|Protectorate|Marine National Park|Transfrontier Park)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const style = STYLE_WORDS[index % STYLE_WORDS.length];
  const noun = /tented/i.test(slot.type)
    ? 'Camp'
    : /hotel/i.test(slot.type)
      ? 'Hotel'
      : /banda/i.test(slot.type)
        ? 'Bandas'
        : 'Lodge';
  const tier = /luxury/i.test(slot.type) ? 'Luxury' : 'Safari';
  return `${short} ${style} ${tier} ${noun}`.replace(/\s+/g, ' ').trim();
}

function buildStayContent({ country, parkName, location, slot, phrases, tourLinks, seed }) {
  const noun = typeNoun(slot.type);
  const where = placementCopy(slot.placement, parkName);
  const overview1 = paragraphWithOneLink(
    `${stayName(parkName, slot, seed)} is a ${slot.type.toLowerCase()} positioned ${where}. The stay is chosen for comfort after long park days, clear inclusions, and a setting that matches the pace of ${parkName}.`,
    phrases,
    tourLinks,
    seed
  );
  const overview2 = paragraphWithOneLink(
    `Rooms and public areas are arranged for rest, hot showers, and easy briefings with your guide. Expect honest guiding support from Eton Safaris on meal plans, laundry, Wi‑Fi limits, and what to pack for this ${noun}.`,
    phrases,
    tourLinks,
    seed + 1
  );

  const blocks = [
    {
      title: 'Rooms & Comfort',
      description: paragraphWithOneLink(
        `Expect well kept rooms or tents with quality bedding, mosquito protection where needed, private or en suite bathrooms, and charging points for cameras. Luxury options lean into space and design; mid-range stays keep the essentials strong without clutter.`,
        phrases,
        tourLinks,
        seed + 2
      ),
    },
    {
      title: 'Dining & Daily Rhythm',
      description: paragraphWithOneLink(
        `Meals follow safari timing: early breakfasts before game drives, packed lunches when useful, and hearty dinners after sundowners. Dietary needs can be noted at booking so the kitchen is ready when you arrive.`,
        phrases,
        tourLinks,
        seed + 3
      ),
    },
    {
      title: 'Location & Access',
      description: paragraphWithOneLink(
        `This property sits ${where}. Transfers, airstrip links, and park gate timing are confirmed before travel so you waste fewer hours on the road and more hours in the field.`,
        phrases,
        tourLinks,
        seed + 4
      ),
    },
    {
      title: 'Who This Stay Suits',
      description: paragraphWithOneLink(
        `Ideal for travellers who want a clear ${slot.type.toLowerCase()} experience near ${parkName} — couples, families with realistic pacing, and photographers who value early starts. Eton Safaris matches room category to your budget and trip style.`,
        phrases,
        tourLinks,
        seed + 5
      ),
    },
    {
      title: 'What Guests Appreciate Most',
      description: paragraphWithOneLink(
        `Guests value transparent inclusions, reliable park logistics, and a stay that answers the usual questions before arrival: how far to the gate, what meals are covered, how laundry works, and whether the ${noun} feels private after busy park days.`,
        phrases,
        tourLinks,
        seed + 6
      ),
    },
  ];

  return {
    description: `${overview1}\n${overview2}`,
    blocks,
  };
}

function embedContent(html, blocks, fields) {
  return `${html}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify({ blocks, itineraries: [], fields }))}-->`;
}

const droppedColumns = new Set();

async function upsertWithFallback(supabase, table, existingId, payload) {
  let current = { ...payload };
  for (const col of droppedColumns) delete current[col];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const request = existingId
      ? supabase.from(table).update(current).eq('id', existingId)
      : supabase.from(table).insert(current).select('id').limit(1);
    const { data, error } = await request;
    if (!error) return { ok: true, id: existingId || data?.[0]?.id, dropped: [...droppedColumns] };
    const column = missingColumn(error.message || '');
    if (column && column in current) {
      droppedColumns.add(column);
      delete current[column];
      continue;
    }
    if (Array.isArray(current.focus_keywords)) {
      current = { ...current, focus_keywords: JSON.stringify(current.focus_keywords) };
      continue;
    }
    return { ok: false, error: error.message, dropped: [...droppedColumns] };
  }
  return { ok: false, error: 'upsert failed', dropped: [...droppedColumns] };
}

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const countryIdx = args.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(args[countryIdx + 1] || '').trim() : '';
const limitIdx = args.indexOf('--limit-parks');
const limitParks = limitIdx >= 0 ? Number(args[limitIdx + 1] || 0) : 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const cacheDir = resolve(process.cwd(), 'scripts', '.cache');
mkdirSync(cacheDir, { recursive: true });

const [parks, tours, keywordRows, existingStays] = await Promise.all([
  fetchAll(supabase, 'national_park', 'id,name,country,location,image_url,seo_slug'),
  fetchAll(supabase, 'tours', 'title,slug,country'),
  fetchAll(supabase, 'keywords', 'country,keywords'),
  fetchAll(supabase, 'accommodations', 'id,name,country,type,description,location').then(async (rows) => {
    try {
      return await fetchAll(
        supabase,
        'accommodations',
        'id,name,country,type,description,location,national_park,park,park_name,national_park_name'
      );
    } catch {
      return rows;
    }
  }),
]);
const realCatalog = loadRealCatalog();
console.log(
  `Loaded parks=${parks.length} tours=${tours.length} keywords=${keywordRows.length} stays=${existingStays.length} realCatalog=${realCatalog.length}`
);

function stayParkName(stay) {
  const fromCol = String(stay.national_park || stay.national_park_name || stay.park || stay.park_name || '').trim();
  if (fromCol) return fromCol;
  const fromLoc = String(stay.location || '').match(/\b(?:Inside|Edge of|Near)\s+(.+)$/i);
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

function slotsForPark(parkName, country) {
  const real = realCatalog.filter(
    (row) =>
      String(row.country || '').toLowerCase() === country.toLowerCase() &&
      parkNamesMatch(row.national_park, parkName)
  );
  const used = new Set();
  return SLOT_PLAN.map((plan) => {
    const matchIndex = real.findIndex((row, index) => !used.has(index) && String(row.type) === plan.type);
    if (matchIndex >= 0) {
      used.add(matchIndex);
      const match = real[matchIndex];
      return { ...plan, realName: match.name, website: match.website || '' };
    }
    const leftover = real.findIndex((_, index) => !used.has(index));
    if (leftover >= 0 && /Lodge|Tented Camp/.test(plan.type)) {
      used.add(leftover);
      const match = real[leftover];
      return { ...plan, type: match.type || plan.type, realName: match.name, website: match.website || '' };
    }
    return { ...plan, realName: '', website: '' };
  });
}

const byParkKey = new Map();
const staysByPark = new Map();
for (const stay of existingStays) {
  const parkLabel = stayParkName(stay);
  const countryKey = String(stay.country || '').trim().toLowerCase();
  const key = `${countryKey}||${parkLabel.toLowerCase()}||${String(stay.name || '').trim().toLowerCase()}`;
  byParkKey.set(key, stay);
  const parkKey = `${countryKey}||${parkLabel.toLowerCase()}`;
  const list = staysByPark.get(parkKey) || [];
  list.push(stay);
  staysByPark.set(parkKey, list);
}

let parkList = parks.filter((p) =>
  onlyCountry ? String(p.country || '').trim().toLowerCase() === onlyCountry.toLowerCase() : true
);
if (limitParks > 0) parkList = parkList.slice(0, limitParks);

console.log(`Parks: ${parkList.length}, types covered: ${ALL_TYPES.join(', ')} (dryRun=${dryRun})`);

let created = 0;
let updated = 0;
let skipped = 0;
let failed = 0;

for (const park of parkList) {
  const parkName = String(park.name || '').trim();
  const country = String(park.country || '').trim();
  if (!parkName || !country) continue;
  const parkKey = `${country.toLowerCase()}||${parkName.toLowerCase()}`;
  const already = staysByPark.get(parkKey) || [];
  if (already.length >= 10) {
    skipped += 1;
    console.log(`Skip (already ${already.length}): ${country} / ${parkName}`);
    continue;
  }

  const phrases = countryKeywords(country, keywordRows);
  const tourLinks = pickTourLinks(tours, country, 12);
  const location = String(park.location || '').trim() || country;
  const haveTypes = new Set(already.map((stay) => String(stay.type || '').trim()));
  const slots = slotsForPark(parkName, country);
  const orderedSlots = [
    ...slots.filter((slot) => !haveTypes.has(slot.type)),
    ...slots.filter((slot) => haveTypes.has(slot.type)),
  ];
  const existingNames = new Set(already.map((stay) => String(stay.name || '').trim().toLowerCase()));
  const needed = 10 - already.length;
  let addedHere = 0;

  for (let i = 0; i < orderedSlots.length && addedHere < needed; i += 1) {
    const slot = orderedSlots[i];
    const name = stayName(parkName, slot, i);
    if (existingNames.has(name.toLowerCase())) continue;
    const key = `${country.toLowerCase()}||${parkName.toLowerCase()}||${name.toLowerCase()}`;
    const existing = byParkKey.get(key);
    const { description, blocks } = buildStayContent({
      country,
      parkName,
      location,
      slot,
      phrases,
      tourLinks,
      seed: i + parkName.length,
    });
    const slug = slugify(`${name}-${country}`);
    const focus = `${name} ${parkName}`.toLowerCase().slice(0, 60);
    const meta = clip(
      `${name} is a ${slot.type.toLowerCase()} inside ${parkName}. Book with Eton Safaris.`,
      155
    );
    const seoTitle = clip(`${name} | Eton Safaris`, 60);
    const canonical = `${SITE_URL}/accommodations/${slug}`;
    const imageUrl = String(park.image_url || '').trim();
    const stamp = new Date().toISOString();
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      name,
      description: meta,
      image: imageUrl || undefined,
      url: slot.website || canonical,
      sameAs: slot.website || undefined,
      address: { '@type': 'PostalAddress', addressCountry: country, addressRegion: location },
      _etonSeo: {
        canonical_url: canonical,
        robots_index: true,
        robots_follow: true,
        breadcrumb_title: name,
        og_title: name,
        og_description: meta,
        schema_type: 'LodgingBusiness',
      },
    };

    const payload = {
      id: existing?.id || randomUUID(),
      name,
      seo_slug: slug,
      location: `Inside ${parkName}`,
      description_title: 'Stay Overview',
      description: embedContent(description, blocks, {
        description_title: 'Stay Overview',
        type: slot.type,
        national_park: parkName,
        country,
        website: slot.website || '',
        placement: 'inside',
        published_at: stamp,
      }),
      type: slot.type,
      country,
      national_park: parkName,
      park: parkName,
      park_name: parkName,
      website: slot.website || '',
      website_url: slot.website || '',
      image_url: imageUrl,
      social_image_url: imageUrl,
      accommodation_blocks: JSON.stringify(blocks),
      post_blocks: JSON.stringify(blocks),
      seo_title: seoTitle,
      meta_description: meta,
      focus_keyword: focus,
      focus_keyphrase: focus,
      focus_keywords: Array.from(new Set([focus, `${country} safari`.toLowerCase(), parkName.toLowerCase()])),
      seo_schema: JSON.stringify(schema),
      updated_date: stamp,
      created_date: stamp,
    };

    if (dryRun) {
      created += 1;
      addedHere += 1;
      existingNames.add(name.toLowerCase());
      continue;
    }

    const result = await upsertWithFallback(supabase, 'accommodations', existing?.id || null, payload);
    if (!result.ok) {
      failed += 1;
      console.warn('Failed', name, result.error);
    } else if (existing?.id) {
      updated += 1;
      addedHere += 1;
      existingNames.add(name.toLowerCase());
    } else {
      created += 1;
      addedHere += 1;
      existingNames.add(name.toLowerCase());
      byParkKey.set(key, { id: result.id, name, country, national_park: parkName });
    }
    await sleep(80);
  }
  console.log(`Park ready: ${country} / ${parkName} (${already.length + addedHere} stays)`);
  await sleep(200);
}

const summary = {
  ok: true,
  dryRun,
  parks: parkList.length,
  created,
  updated,
  skipped,
  failed,
  types: ALL_TYPES,
};
writeFileSync(resolve(cacheDir, 'seed-park-accommodations.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
