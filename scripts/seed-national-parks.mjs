/**
 * Seed / refresh national parks for all countries in the Bwindi CMS format.
 * Each overview paragraph includes ~3 country keywords hyperlinked to live tour packages.
 * Downloads clean landscape photos (no logo intent) via DuckDuckGo.
 *
 * Usage:
 *   node scripts/seed-national-parks.mjs --dry-run
 *   node scripts/seed-national-parks.mjs
 *   node scripts/seed-national-parks.mjs --country Uganda
 *   node scripts/seed-national-parks.mjs --content-only
 *   node scripts/seed-national-parks.mjs --new-only
 */
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { allParkEntries } from './lib/national-parks-catalog.mjs';

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

function countryKeywords(country, keywordRows, tours) {
  const fromLibrary = keywordRows
    .filter((row) => String(row.country || '').trim().toLowerCase() === country.toLowerCase())
    .flatMap((row) => parseKeywords(row.keywords));
  const defaults = [
    `${country} safari`,
    `${country} wildlife safari`,
    `${country} tour packages`,
    `best ${country} safari`,
    `${country} national parks`,
    `${country} safari holidays`,
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
  if (!unique.length) {
    unique.push(...defaults);
  }
  // Prefer keywords that can map to a tour title/slug loosely
  return unique;
}

function pickTourLinks(tours, country, count = 9) {
  const pool = tours.filter((t) => String(t.country || '').trim().toLowerCase() === country.toLowerCase());
  const links = [];
  for (let i = 0; i < pool.length && links.length < count; i += 1) {
    const tour = pool[(i * 7) % pool.length];
    const slug = String(tour.slug || '').trim() || slugify(tour.title);
    if (!slug) continue;
    if (links.some((l) => l.slug === slug)) continue;
    links.push({ slug, title: String(tour.title || slug) });
  }
  return links;
}

function linkPhrase(phrase, href) {
  return `<a href="${href}">${phrase}</a>`;
}

function paragraphWithLinks(text, phrases, tourLinks, startIndex) {
  let html = `<p>${text}`;
  const phrase = phrases[startIndex % phrases.length];
  const tour = tourLinks[startIndex % Math.max(tourLinks.length, 1)];
  if (phrase && tour?.slug) {
    html += ` Eton Safaris also plans <a href="/tours/${tour.slug}">${phrase}</a> that include time in this park.`;
  }
  html += `</p>`;
  return html;
}

function buildParkContent({ country, park, phrases, tourLinks }) {
  const name = park.name.trim();
  const overview1 = paragraphWithLinks(
    `${name}, located in ${park.location}, is ${park.hook}. The protected landscape rewards unhurried travel, with scenery and wildlife that feel distinctly tied to ${country}'s wider safari story.`,
    phrases,
    tourLinks,
    0
  );
  const overview2 = paragraphWithLinks(
    `What makes ${name} memorable is the mix of habitats and sightings: ${park.wildlife}. Guides pace the day around light, tracks, and guest interests rather than a rigid checklist.`,
    phrases,
    tourLinks,
    3
  );
  const overview3 = paragraphWithLinks(
    `${park.visit}. With Eton Safaris, logistics stay clear so you spend more time in the field and less time rearranging transfers.`,
    phrases,
    tourLinks,
    6
  );

  const blocks = [
    {
      title: `Wildlife In ${name}`,
      description: paragraphWithLinks(
        `Expect a wildlife cast shaped by this landscape: ${park.wildlife}. Early starts and patient stops usually deliver the strongest encounters.`,
        phrases,
        tourLinks,
        1
      ),
    },
    {
      title: `How To Visit ${name}`,
      description: paragraphWithLinks(
        `${park.visit}. Seasonality, road conditions, and park fees change through the year, so confirm the current operating details when you book.`,
        phrases,
        tourLinks,
        4
      ),
    },
    {
      title: `Best Experiences In ${name}`,
      description: paragraphWithLinks(
        `Signature time here includes ${park.experiences}. Pairing the park with nearby destinations creates a smoother multi day route without rushed driving.`,
        phrases,
        tourLinks,
        2
      ),
    },
    {
      title: `Health & Safety in ${name}`,
      description: paragraphWithLinks(
        `Your wellbeing comes first in ${name}. Eton Safaris briefings cover trail difficulty, wildlife distance rules, hydration, sun protection, and what to do if weather turns quickly. Guests with medical conditions should carry personal medication, and we recommend travel insurance that includes remote area evacuation. Our guides monitor pace so the day stays enjoyable rather than exhausting.`,
        phrases,
        tourLinks,
        5
      ),
    },
    {
      title: 'Packing List for This Park',
      description: paragraphWithLinks(
        `Pack light layers for changing temperatures, broken in walking shoes or boots, a waterproof jacket, hat, sunscreen, insect repellent, binoculars, and a reusable water bottle. Neutral clothing works best for wildlife viewing. Bring a small daypack for permits, snacks, and a camera with spare battery. Exact gear can shift with season and activity, so we send a tailored packing note after booking.`,
        phrases,
        tourLinks,
        7
      ),
    },
    {
      title: 'What Sets Us Apart',
      description: paragraphWithLinks(
        `Eton Safaris plans ${name} with private guiding, transparent inclusions, and lodge choices matched to your style. We secure park logistics early, keep driving times realistic, and stay reachable before and during travel. The result is a calmer park experience with more time for wildlife and less uncertainty around permits, transfers, and daily timing.`,
        phrases,
        tourLinks,
        8
      ),
    },
  ];

  const description = `${overview1}\n${overview2}\n${overview3}`;
  return { description, blocks };
}

function embedContent(html, blocks, fields) {
  const payload = { blocks, itineraries: [], fields };
  return `${html}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify(payload))}-->`;
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
  if (!match) throw new Error(`No vqd for ${query}`);
  return match[1];
}

async function searchImages(query, limit = 8) {
  const vqd = await getVqd(query);
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,&p=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: 'https://duckduckgo.com/',
    },
  });
  if (!response.ok) throw new Error(`image search ${response.status}`);
  const payload = await response.json();
  return (payload.results || [])
    .map((item) => ({
      image: String(item.image || '').trim(),
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
      title: String(item.title || ''),
      source: String(item.url || item.source || ''),
    }))
    .filter((item) => item.image.startsWith('http'))
    .filter((item) => item.width >= 1000 || item.height >= 700)
    .filter((item) => !/logo|watermark|stamp|banner|flyer|brochure/i.test(`${item.title} ${item.source} ${item.image}`))
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
  });
  if (!response.ok) throw new Error(`download ${response.status}`);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new Error('not image');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 30_000) throw new Error('too small');
  return { buffer, contentType };
}

async function uploadBuffer(supabase, buffer, contentType, folder) {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const path = `${folder}/${Date.now()}-${hash}.${ext}`;
  for (const bucket of ['media', 'images', 'uploads', 'public']) {
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: true });
    if (!error) return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  throw new Error('upload failed');
}

async function fetchCleanParkImage(supabase, parkName, country, cacheDir) {
  const cacheFile = resolve(cacheDir, `${slugify(`${country}-${parkName}`)}.txt`);
  if (existsSync(cacheFile)) {
    const cached = readFileSync(cacheFile, 'utf8').trim();
    if (cached.startsWith('http')) return cached;
  }
  const query = `${parkName} ${country} landscape wildlife nature scenery photograph -logo -watermark -stamp`;
  const results = await searchImages(query, 10);
  for (const result of results) {
    try {
      const { buffer, contentType } = await downloadImage(result.image);
      const url = await uploadBuffer(supabase, buffer, contentType, 'national-parks');
      writeFileSync(cacheFile, url);
      return url;
    } catch {
      /* try next */
    }
  }
  return '';
}

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i);
  return match?.[1] || null;
}

const dropped = new Set();
async function upsertPark(supabase, existingId, payload) {
  let current = { ...payload };
  for (const col of dropped) delete current[col];
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const request = existingId
      ? supabase.from('national_park').update(current).eq('id', existingId)
      : supabase.from('national_park').insert(current).select('id').limit(1);
    const { data, error } = await request;
    if (!error) return { ok: true, id: existingId || data?.[0]?.id };
    const column = missingColumn(error.message || '');
    if (column && column in current) {
      dropped.add(column);
      delete current[column];
      continue;
    }
    if (Array.isArray(current.focus_keywords)) {
      current = { ...current, focus_keywords: JSON.stringify(current.focus_keywords) };
      continue;
    }
    if (/fetch failed|520|502|503|504/i.test(error.message || '') && attempt < 5) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: 'upsert failed' };
}

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const contentOnly = args.includes('--content-only');
const newOnly = args.includes('--new-only');
const countryIdx = args.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(args[countryIdx + 1] || '').trim() : '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const cacheDir = resolve(process.cwd(), 'scripts', '.cache', 'park-images');
mkdirSync(cacheDir, { recursive: true });

const [existingParks, tours, keywordRows] = await Promise.all([
  fetchAll(supabase, 'national_park', 'id,name,country,image_url'),
  fetchAll(supabase, 'tours', 'id,title,slug,country,category'),
  fetchAll(supabase, 'keywords', 'country,category,keywords'),
]);

const byNameCountry = new Map();
for (const row of existingParks) {
  const key = `${String(row.country || '').trim().toLowerCase()}||${String(row.name || '').trim().toLowerCase()}`;
  byNameCountry.set(key, row);
}

let created = 0;
let updated = 0;
let failed = 0;

const entries = allParkEntries().filter((entry) =>
  onlyCountry ? entry.country.toLowerCase() === onlyCountry.toLowerCase() : true
);

console.log(`Parks to process: ${entries.length} (dryRun=${dryRun}, contentOnly=${contentOnly}, newOnly=${newOnly})`);

for (const { country, park } of entries) {
  const name = park.name.trim();
  const key = `${country.toLowerCase()}||${name.toLowerCase()}`;
  const existing = byNameCountry.get(key);
  if (newOnly && existing?.id) continue;
  const phrases = countryKeywords(country, keywordRows, tours);
  const tourLinks = pickTourLinks(tours, country, 12);
  if (tourLinks.length < 3) {
    console.warn(`Few tours for ${country}; park links may repeat.`);
  }
  const { description, blocks } = buildParkContent({ country, park, phrases, tourLinks });
  const slug = slugify(name);
  const focus = name.toLowerCase();
  const focusKeywords = Array.from(
    new Set([focus, `${country} national parks`.toLowerCase(), ...phrases.slice(0, 18).map((p) => p.toLowerCase())])
  );
  const meta = clip(
    `${name} in ${park.location} is ${park.hook}. Plan wildlife time and logistics with Eton Safaris.`,
    155
  );
  const seoTitle = clip(`${name} | Eton Safaris`, 60);
  const canonical = `${SITE_URL}/parks/${slug}`;

  let imageUrl = String(existing?.image_url || '').trim();
  if (!dryRun && !contentOnly) {
    try {
      const fresh = await fetchCleanParkImage(supabase, name, country, cacheDir);
      if (fresh) imageUrl = fresh;
      await sleep(350);
    } catch (error) {
      console.warn(`Image failed for ${name}:`, error.message);
    }
  }

  const stamp = new Date().toISOString();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name,
    description: meta,
    image: imageUrl || undefined,
    url: canonical,
    address: { '@type': 'PostalAddress', addressCountry: country, addressRegion: park.location },
    _etonSeo: {
      canonical_url: canonical,
      robots_index: true,
      robots_follow: true,
      breadcrumb_title: name,
      og_title: name,
      og_description: meta,
      schema_type: 'TouristAttraction',
    },
  };

  const payload = {
    id: existing?.id || randomUUID(),
    name,
    slug,
    location: park.location,
    description_title: 'Park Overview',
    description: embedContent(description, blocks, {
      description_title: 'Park Overview',
      location: park.location,
      country,
      published_at: stamp,
    }),
    country,
    image_url: imageUrl,
    social_image_url: imageUrl,
    park_blocks: JSON.stringify(blocks),
    post_blocks: JSON.stringify(blocks),
    seo_slug: slug,
    published_at: stamp,
    seo_title: seoTitle,
    meta_description: meta,
    focus_keyword: focus,
    focus_keywords: focusKeywords,
    seo_schema: JSON.stringify(schema),
    updated_date: stamp,
    created_date: stamp,
  };

  if (dryRun) {
    console.log(`[dry-run] ${country} / ${name} → ${slug} (links=${tourLinks.length})`);
    created += 1;
    continue;
  }

  const result = await upsertPark(supabase, existing?.id || null, payload);
  if (!result.ok) {
    failed += 1;
    console.warn('Failed', name, result.error);
  } else if (existing?.id) {
    updated += 1;
    console.log(`Updated ${country} / ${name}`);
  } else {
    created += 1;
    console.log(`Created ${country} / ${name}`);
  }
}

console.log(JSON.stringify({ ok: true, dryRun, created, updated, failed, dropped: [...dropped] }, null, 2));
