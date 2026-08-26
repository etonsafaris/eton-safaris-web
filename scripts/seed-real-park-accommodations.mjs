/**
 * Seed REAL park accommodations from data/real-park-accommodations-*.json
 * - Exact property names that exist
 * - Official website URL stored in embed fields (+ website column when available)
 * - Cover image from the property website og:image / twitter:image (fallback: DDG lodge photo)
 * - Stay Overview + blocks; each paragraph has one country keyword → tour link
 * - SEO set
 *
 * Usage:
 *   node scripts/seed-real-park-accommodations.mjs --dry-run
 *   node scripts/seed-real-park-accommodations.mjs --country Uganda
 *   node scripts/seed-real-park-accommodations.mjs
 */
import { randomUUID, createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

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
  return new Promise((r) => setTimeout(r, ms));
}

function parseKeywords(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* ignore */
  }
  return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
}

async function fetchAll(supabase, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    let lastError = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await supabase.from(table).select(columns).range(from, from + 499);
      if (!error) {
        rows.push(...(data || []));
        if (!data || data.length < 500) return rows;
        lastError = null;
        break;
      }
      lastError = error;
      if (!/timeout|fetch failed|520|502|503|504|schema cache|PGRST002|Could not query the database/i.test(error.message || '')) {
        throw new Error(`${table}: ${error.message}`);
      }
      await sleep(1500 * (attempt + 1));
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

const droppedColumns = new Set();
async function upsertWithFallback(supabase, table, existingId, payload) {
  let current = { ...payload };
  for (const col of droppedColumns) delete current[col];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const request = existingId
      ? supabase.from(table).update(current).eq('id', existingId)
      : supabase.from(table).insert(current).select('id').limit(1);
    const { data, error } = await request;
    if (!error) return { ok: true, id: existingId || data?.[0]?.id };
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
    if (/timeout|fetch failed|520|502|503|504/i.test(error.message || '') && attempt < 4) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: 'upsert failed' };
}

function loadCatalog() {
  const dir = resolve(process.cwd(), 'data');
  const files = readdirSync(dir).filter((f) => f.startsWith('real-park-accommodations-') && f.endsWith('.json'));
  const rows = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    if (Array.isArray(parsed)) rows.push(...parsed);
  }
  // Deduplicate by country+name
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${String(row.country || '').toLowerCase()}||${String(row.name || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(row.name && row.national_park && row.country);
  });
}

function matchParkName(raw, parks) {
  const needle = slugify(raw);
  const exact = parks.find((p) => slugify(p.name) === needle);
  if (exact) return exact;
  const soft = parks.find((p) => {
    const slug = slugify(p.name);
    return slug.includes(needle) || needle.includes(slug.replace(/-national-park|-national-reserve|-game-reserve|-conservation-area|-nature-reserve|-protected-area|-protectorate/g, ''));
  });
  return soft || null;
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

function pickTourLinks(tours, country, count = 10) {
  const pool = tours.filter((t) => String(t.country || '').trim().toLowerCase() === country.toLowerCase());
  const links = [];
  for (let i = 0; i < Math.max(pool.length, count) && links.length < count; i += 1) {
    if (!pool.length) break;
    const tour = pool[(i * 7) % pool.length];
    const slug = String(tour.slug || '').trim() || slugify(tour.title);
    if (!slug || links.some((l) => l.slug === slug)) continue;
    links.push({ slug });
  }
  return links;
}

function oneKeywordParagraph(text, phrases, tourLinks, index) {
  const phrase = phrases[index % phrases.length];
  const tour = tourLinks[index % Math.max(tourLinks.length, 1)];
  let html = `<p>${text}`;
  if (phrase && tour) {
    html += ` Travellers comparing a <a href="/tours/${tour.slug}">${phrase}</a> often include this stay when Eton Safaris builds the route.`;
  }
  html += `</p>`;
  return html;
}

function placementLabel(placement, parkName) {
  if (placement === 'inside') return `inside ${parkName}`;
  if (placement === 'edge') return `on the edge of ${parkName}`;
  return `near ${parkName}`;
}

function buildStayHtml(entry, parkName, phrases, tourLinks) {
  const where = placementLabel(entry.placement || 'edge', parkName);
  const note = entry.location_note ? ` (${entry.location_note})` : '';
  const website = String(entry.website || '').trim();
  const overview1 = oneKeywordParagraph(
    `${entry.name} is a real ${String(entry.type || 'lodge').toLowerCase()} positioned ${where}${note}. Guests stay here for proven park access, clear meal rhythms, and a property that matches the character of ${parkName}.`,
    phrases,
    tourLinks,
    0
  );
  const overview2 = oneKeywordParagraph(
    `Before arrival, Eton Safaris confirms room category, meal plan, transfer time to the gate, and what is included so there are few surprises on the ground.${website ? ` The property’s own site is <a href="${website}" rel="noopener noreferrer" target="_blank">${website.replace(/^https?:\/\//, '')}</a>.` : ''}`,
    phrases,
    tourLinks,
    1
  );
  const blocks = [
    {
      title: 'Rooms & Comfort',
      description: oneKeywordParagraph(
        `Expect the published room standard for this property: proper beds, en suite or private bathrooms where advertised, mosquito protection as needed, and charging for cameras. Luxury stays emphasise space and finish; mid-range stays keep essentials strong and practical.`,
        phrases,
        tourLinks,
        2
      ),
    },
    {
      title: 'Dining & Daily Rhythm',
      description: oneKeywordParagraph(
        `Meals follow safari timing — early breakfasts, packed lunches when useful, and dinners after game drives or treks. Share dietary needs at booking so the kitchen is ready when you arrive.`,
        phrases,
        tourLinks,
        3
      ),
    },
    {
      title: 'Location & Access',
      description: oneKeywordParagraph(
        `This stay sits ${where}${note}. Gate times, airstrip transfers, and sector logistics for ${parkName} are planned with Eton Safaris so you spend more hours in the field and fewer rearranging roads.`,
        phrases,
        tourLinks,
        4
      ),
    },
    {
      title: 'Who This Stay Suits',
      description: oneKeywordParagraph(
        `Best for travellers who want a verified ${String(entry.type || 'property').toLowerCase()} linked to ${parkName} — couples, families with realistic pacing, and photographers who value early starts from a known base.`,
        phrases,
        tourLinks,
        5
      ),
    },
    {
      title: 'What Guests Appreciate Most',
      description: oneKeywordParagraph(
        `Guests value honesty: real property, real location relative to the park, transparent inclusions, and answers before travel about Wi‑Fi, laundry, packing, and how far the morning briefing is from the room.`,
        phrases,
        tourLinks,
        6
      ),
    },
  ];
  return { description: `${overview1}\n${overview2}`, blocks };
}

function embedContent(html, blocks, fields) {
  return `${html}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify({ blocks, itineraries: [], fields }))}-->`;
}

async function fetchOgImage(website) {
  if (!website) return '';
  try {
    const response = await fetch(website, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return '';
    const html = await response.text();
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        let url = match[1].trim();
        if (url.startsWith('//')) url = `https:${url}`;
        if (url.startsWith('/')) {
          const base = new URL(website);
          url = `${base.origin}${url}`;
        }
        if (url.startsWith('http')) return url;
      }
    }
  } catch {
    /* ignore */
  }
  return '';
}

async function getVqd(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });
  const html = await response.text();
  const match = html.match(/vqd=["']([^"']+)["']/i) || html.match(/vqd=([\d-]+)/i);
  if (!match) throw new Error('no vqd');
  return match[1];
}

async function searchLodgeImages(query, limit = 6) {
  const vqd = await getVqd(query);
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,&p=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: 'https://duckduckgo.com/',
    },
  });
  if (!response.ok) throw new Error(`search ${response.status}`);
  const payload = await response.json();
  return (payload.results || [])
    .map((item) => String(item.image || '').trim())
    .filter((image) => image.startsWith('http'))
    .filter((image) => !/logo|icon|sprite|banner|watermark/i.test(image))
    .slice(0, limit);
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'image/*,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`download ${response.status}`);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new Error('not image');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 20_000) throw new Error('too small');
  return { buffer, contentType };
}

async function uploadBuffer(supabase, buffer, contentType) {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const path = `accommodations/${Date.now()}-${hash}.${ext}`;
  for (const bucket of ['media', 'images', 'uploads', 'public']) {
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: true });
    if (!error) return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  throw new Error('upload failed');
}

async function resolveCoverImage(supabase, entry, cacheDir) {
  const cacheFile = resolve(cacheDir, `${slugify(`${entry.country}-${entry.name}`)}.txt`);
  if (existsSync(cacheFile)) {
    const cached = readFileSync(cacheFile, 'utf8').trim();
    if (cached.startsWith('http')) return cached;
  }

  const candidates = [];
  const og = await fetchOgImage(entry.website);
  if (og) candidates.push(og);

  try {
    const searched = await searchLodgeImages(`"${entry.name}" lodge safari hotel exterior -logo -map`, 6);
    candidates.push(...searched);
  } catch {
    /* ignore */
  }

  for (const imageUrl of candidates) {
    try {
      const { buffer, contentType } = await downloadImage(imageUrl);
      const publicUrl = await uploadBuffer(supabase, buffer, contentType);
      writeFileSync(cacheFile, publicUrl);
      return publicUrl;
    } catch {
      /* try next */
    }
  }
  return '';
}

/** Official / authoritative park pages for public website_url */
const PARK_OFFICIAL_URLS = {
  'Bwindi Impenetrable National Park': 'https://ugandawildlife.org/explore-and-experience/explore-species/gorilla/',
  'Mgahinga Gorilla National Park': 'https://ugandawildlife.org/',
  'Queen Elizabeth National Park': 'https://ugandawildlife.org/',
  'Murchison Falls National Park': 'https://ugandawildlife.org/',
  'Kibale National Park': 'https://ugandawildlife.org/',
  'Lake Mburo National Park': 'https://ugandawildlife.org/',
  'Kidepo Valley National Park': 'https://ugandawildlife.org/',
  'Mount Elgon National Park': 'https://ugandawildlife.org/',
  'Rwenzori Mountains National Park': 'https://ugandawildlife.org/',
  'Semuliki National Park': 'https://ugandawildlife.org/',
  'Masai Mara National Reserve': 'https://www.kws.go.ke/',
  'Amboseli National Park': 'https://www.kws.go.ke/',
  'Serengeti National Park': 'https://www.tanzaniaparks.go.tz/',
  'Ngorongoro Conservation Area': 'https://www.ncaa.go.tz/',
  'Volcanoes National Park': 'https://www.visitrwanda.com/',
  'Akagera National Park': 'https://www.akagera.org/',
  'Nyungwe National Park': 'https://www.visitrwanda.com/',
  'Chobe National Park': 'https://www.botswanatourism.co.bw/',
  'Kruger National Park': 'https://www.sanparks.org/parks/kruger',
  'Etosha National Park': 'https://www.ethete.gov.na/',
  'South Luangwa National Park': 'https://www.mota.gov.zm/',
  'Hwange National Park': 'https://www.zimparks.org/',
  'Virunga National Park': 'https://visitvirunga.org/',
};

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const countryIdx = args.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(args[countryIdx + 1] || '').trim() : '';
const skipImages = args.includes('--skip-images');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const cacheDir = resolve(process.cwd(), 'scripts', '.cache', 'stay-images');
mkdirSync(cacheDir, { recursive: true });

const catalog = loadCatalog().filter((row) =>
  onlyCountry ? String(row.country).toLowerCase() === onlyCountry.toLowerCase() : true
);

const [parks, tours, keywordRows, existingStays] = await Promise.all([
  fetchAll(supabase, 'national_park', 'id,name,country,location,image_url,seo_slug,description'),
  fetchAll(supabase, 'tours', 'title,slug,country'),
  fetchAll(supabase, 'keywords', 'country,keywords'),
  fetchAll(supabase, 'accommodations', 'id,name,country,description,location'),
]);

console.log(
  JSON.stringify(
    { catalog: catalog.length, parks: parks.length, tours: tours.length, existingStays: existingStays.length, dryRun, skipImages },
    null,
    2
  )
);

const stayByKey = new Map();
for (const stay of existingStays) {
  stayByKey.set(`${String(stay.country || '').toLowerCase()}||${String(stay.name || '').toLowerCase()}`, stay);
}

let created = 0;
let updated = 0;
let failed = 0;
let unmatched = [];

for (const entry of catalog) {
  const park = matchParkName(entry.national_park, parks.filter((p) => String(p.country).toLowerCase() === String(entry.country).toLowerCase()));
  if (!park) {
    unmatched.push(`${entry.country} / ${entry.national_park} / ${entry.name}`);
    continue;
  }
  const parkName = park.name;
  const country = entry.country;
  const phrases = countryKeywords(country, keywordRows);
  const tourLinks = pickTourLinks(tours, country, 10);
  const { description, blocks } = buildStayHtml(entry, parkName, phrases, tourLinks);
  const key = `${country.toLowerCase()}||${entry.name.toLowerCase()}`;
  const existing = stayByKey.get(key);
  const slug = slugify(`${entry.name}-${country}`);
  const website = String(entry.website || '').trim();
  const stamp = new Date().toISOString();
  const meta = clip(
    `${entry.name} is a ${String(entry.type || 'lodge').toLowerCase()} ${placementLabel(entry.placement, parkName)}. Book with Eton Safaris.`,
    155
  );
  const seoTitle = clip(`${entry.name} | Eton Safaris`, 60);
  const canonical = `${SITE_URL}/accommodations/${slug}`;

  let imageUrl = '';
  if (!dryRun && !skipImages) {
    try {
      imageUrl = await resolveCoverImage(supabase, entry, cacheDir);
      await sleep(200);
    } catch (error) {
      console.warn('image failed', entry.name, error.message);
    }
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: entry.name,
    description: meta,
    image: imageUrl || undefined,
    url: website || canonical,
    sameAs: website || undefined,
    address: {
      '@type': 'PostalAddress',
      addressCountry: country,
      addressRegion: entry.location_note || park.location || '',
    },
    _etonSeo: {
      canonical_url: canonical,
      robots_index: true,
      robots_follow: true,
      breadcrumb_title: entry.name,
      og_title: entry.name,
      og_description: meta,
      schema_type: 'LodgingBusiness',
      website,
    },
  };

  const payload = {
    id: existing?.id || randomUUID(),
    name: entry.name,
    seo_slug: slug,
    location: `${placementLabel(entry.placement, parkName)}${entry.location_note ? ` — ${entry.location_note}` : ''}`,
    description_title: 'Stay Overview',
    description: embedContent(description, blocks, {
      description_title: 'Stay Overview',
      type: entry.type,
      national_park: parkName,
      country,
      website,
      placement: entry.placement,
      location_note: entry.location_note || '',
      published_at: stamp,
    }),
    type: entry.type,
    country,
    national_park: parkName,
    park: parkName,
    park_name: parkName,
    website,
    website_url: website,
    image_url: imageUrl,
    social_image_url: imageUrl,
    accommodation_blocks: JSON.stringify(blocks),
    post_blocks: JSON.stringify(blocks),
    seo_title: seoTitle,
    meta_description: meta,
    focus_keyword: `${entry.name} ${parkName}`.toLowerCase().slice(0, 60),
    focus_keyphrase: `${entry.name} ${parkName}`.toLowerCase().slice(0, 60),
    focus_keywords: Array.from(
      new Set([entry.name.toLowerCase(), `${country} safari`.toLowerCase(), parkName.toLowerCase()])
    ),
    seo_schema: JSON.stringify(schema),
    updated_date: stamp,
    created_date: stamp,
  };

  if (dryRun) {
    created += 1;
    continue;
  }

  const result = await upsertWithFallback(supabase, 'accommodations', existing?.id || null, payload);
  if (!result.ok) {
    failed += 1;
    console.warn('Failed', entry.name, result.error);
  } else if (existing?.id) {
    updated += 1;
    console.log(`Updated ${country} / ${entry.name}`);
  } else {
    created += 1;
    stayByKey.set(key, { id: result.id, name: entry.name, country });
    console.log(`Created ${country} / ${entry.name}`);
  }
}

// Attach official park URLs into park description embed fields + website columns when possible
let parksUpdated = 0;
if (!dryRun) {
  for (const park of parks) {
    const official = PARK_OFFICIAL_URLS[park.name] || '';
    const publicUrl = `${SITE_URL}/parks/${slugify(park.seo_slug || park.name)}`;
    const website = official || publicUrl;
    // Light-touch: write website fields; preserve description
    const payload = {
      website,
      website_url: website,
      official_url: official || website,
    };
    const result = await upsertWithFallback(supabase, 'national_park', park.id, payload);
    if (result.ok) parksUpdated += 1;
  }
}

const summary = {
  ok: true,
  dryRun,
  catalog: catalog.length,
  created,
  updated,
  failed,
  unmatched: unmatched.slice(0, 40),
  unmatchedCount: unmatched.length,
  parksUpdated,
  dropped: [...droppedColumns],
};
writeFileSync(resolve(process.cwd(), 'scripts', '.cache', 'seed-real-stays.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
