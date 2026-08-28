/**
 * Replace tour cover images with clean, category-aligned photos (no watermarks/logos).
 * Uses curated Unsplash pools first, DuckDuckGo as fallback. Uploads optimized WebP to Supabase.
 *
 * Usage:
 *   node scripts/assign-tour-images-from-ddg.mjs --dry-run
 *   node scripts/assign-tour-images-from-ddg.mjs --replace-all
 *   node scripts/assign-tour-images-from-ddg.mjs --replace-all --limit 100
 *   node scripts/assign-tour-images-from-ddg.mjs --country Uganda --replace-all
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  curatedUrlsForTheme,
  imageLooksRisky,
  themeForTour,
} from './lib/tour-image-pools.mjs';

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

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function slugSafe(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
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

function searchQueryFor(country, category, title) {
  const theme = themeForTour({ category, title, country });
  const base = `${country} `;
  if (theme === 'gorilla') return `${base}mountain gorilla rainforest wildlife photograph -logo -watermark`;
  if (theme === 'chimp') return `${base}chimpanzee primate forest wildlife photograph -logo -watermark`;
  if (theme === 'beach') return `${base}tropical beach coastline scenic photograph -logo -watermark`;
  if (theme === 'mountain') return `${base}mountain trekking landscape scenic photograph -logo -watermark`;
  if (theme === 'birding') return `${base}bird wildlife nature photograph -logo -watermark`;
  if (theme === 'desert') return `${base}desert landscape scenic photograph -logo -watermark`;
  if (theme === 'culture') return `${base}cultural landscape scenic photograph -logo -watermark`;
  return `${base}African wildlife savannah game drive photograph -logo -watermark`;
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
  if (!match) throw new Error(`No DuckDuckGo vqd token for query: ${query}`);
  return match[1];
}

async function searchDuckDuckGoImages(query, limit = 20) {
  const vqd = await getVqd(query);
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,&p=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: 'https://duckduckgo.com/',
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`DuckDuckGo image search failed (${response.status})`);
  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];
  return results
    .map((item) => ({
      image: String(item.image || item.thumbnail || '').trim(),
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
      title: String(item.title || ''),
      source: String(item.url || item.source || ''),
    }))
    .filter((item) => item.image.startsWith('http'))
    .filter((item) => item.width >= 900 || item.height >= 600)
    .filter((item) => !imageLooksRisky(`${item.title} ${item.source} ${item.image}`))
    .slice(0, limit);
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Download failed ${response.status}`);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new Error(`Not an image: ${contentType}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 20_000) throw new Error('Image too small');
  return { buffer, contentType };
}

async function optimizeBuffer(buffer, contentType) {
  try {
    const sharp = (await import('sharp')).default;
    const optimized = await sharp(buffer)
      .rotate()
      .resize({ width: 1400, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();
    if (optimized.length > 8_000) {
      return { buffer: optimized, contentType: 'image/webp' };
    }
  } catch {
    /* sharp optional — upload original */
  }
  return { buffer, contentType };
}

async function uploadBuffer(supabase, buffer, contentType, folder) {
  const buckets = ['media', 'images', 'uploads', 'public'];
  const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const path = `${folder}/${Date.now()}-${hash}.${ext}`;
  let lastError = null;
  for (const bucket of buckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (!error) {
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    lastError = error;
  }
  throw new Error(lastError?.message || 'Upload failed');
}

async function buildPoolForGroup({ supabase, country, category, theme, needed, cacheFile, force, dryRun }) {
  if (!force && existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
      if (Array.isArray(cached) && cached.length >= Math.min(needed, 4)) {
        return cached;
      }
    } catch {
      /* rebuild */
    }
  }

  if (dryRun) return [];

  const uploaded = new Set();
  const pool = [];

  const curated = curatedUrlsForTheme(theme, needed);
  for (const sourceUrl of curated) {
    if (pool.length >= needed) break;
    try {
      const { buffer, contentType } = await downloadImage(sourceUrl);
      const optimized = await optimizeBuffer(buffer, contentType);
      const publicUrl = await uploadBuffer(supabase, optimized.buffer, optimized.contentType, 'tours');
      if (uploaded.has(publicUrl)) continue;
      uploaded.add(publicUrl);
      pool.push(publicUrl);
      console.log(`  curated ${pool.length}/${needed} (${theme})`);
      await sleep(250);
    } catch (error) {
      console.warn('  skip curated:', error.message);
    }
  }

  if (pool.length < needed) {
    const query = searchQueryFor(country, category, '');
    try {
      const results = await searchDuckDuckGoImages(query, needed - pool.length + 8);
      for (const result of results) {
        if (pool.length >= needed) break;
        try {
          const { buffer, contentType } = await downloadImage(result.image);
          const optimized = await optimizeBuffer(buffer, contentType);
          const publicUrl = await uploadBuffer(supabase, optimized.buffer, optimized.contentType, 'tours');
          if (uploaded.has(publicUrl)) continue;
          uploaded.add(publicUrl);
          pool.push(publicUrl);
          console.log(`  ddg ${pool.length}/${needed}`);
          await sleep(400);
        } catch (error) {
          console.warn('  skip ddg:', error.message);
        }
      }
    } catch (error) {
      console.warn('  ddg search failed:', error.message);
    }
  }

  if (pool.length) writeFileSync(cacheFile, JSON.stringify(pool, null, 2));
  return pool;
}

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const replaceAll = args.includes('--replace-all');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 0 : 0;
const countryIdx = args.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(args[countryIdx + 1] || '').trim() : '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const cacheDir = resolve(process.cwd(), 'scripts', '.cache', 'tour-images-v2');
mkdirSync(cacheDir, { recursive: true });

const tours = await fetchAll(
  supabase,
  'tours',
  'id,title,country,category,image_url,social_image_url,slug'
);

const filtered = tours.filter((tour) => {
  const country = String(tour.country || '').trim();
  if (onlyCountry && country.toLowerCase() !== onlyCountry.toLowerCase()) return false;
  if (replaceAll) return true;
  const image = String(tour.image_url || '').trim();
  return force || !image || imageLooksRisky(image);
});

const targetTours = limit > 0 ? filtered.slice(0, limit) : filtered;
console.log(
  `Tours total=${tours.length}; candidates=${filtered.length}; processing=${targetTours.length}; replaceAll=${replaceAll}; dryRun=${dryRun}`
);

const byGroup = new Map();
for (const tour of targetTours) {
  const country = String(tour.country || '').trim();
  const category = String(tour.category || '').trim();
  const theme = themeForTour({ category, title: tour.title, country });
  const key = `${country}||${category}||${theme}`;
  if (!byGroup.has(key)) byGroup.set(key, { country, category, theme, tours: [] });
  byGroup.get(key).tours.push(tour);
}

const poolByGroup = new Map();
let uploaded = 0;
let assigned = 0;
let failed = 0;

for (const [key, group] of byGroup) {
  const { country, category, theme, tours: groupTours } = group;
  const needed = Math.min(30, Math.max(10, Math.ceil(groupTours.length / 4)));
  const cacheFile = resolve(cacheDir, `${slugSafe(key)}.json`);
  console.log(`\nPool for ${country} / ${category} [${theme}] → need ~${needed}`);

  const pool = await buildPoolForGroup({
    supabase,
    country,
    category,
    theme,
    needed,
    cacheFile,
    force: force || replaceAll,
    dryRun,
  });
  uploaded += pool.length;
  poolByGroup.set(key, pool);
}

for (const [key, group] of byGroup) {
  const pool = poolByGroup.get(key) || [];
  const { tours: groupTours } = group;
  if (!pool.length && !dryRun) {
    console.warn(`No images for ${key}; skipping ${groupTours.length} tours`);
    failed += groupTours.length;
    continue;
  }
  for (let i = 0; i < groupTours.length; i += 1) {
    const tour = groupTours[i];
    const imageUrl = pool[i % Math.max(pool.length, 1)] || '';
    if (dryRun) {
      assigned += 1;
      continue;
    }
    if (!imageUrl) {
      failed += 1;
      continue;
    }
    const { error } = await supabase
      .from('tours')
      .update({
        image_url: imageUrl,
        social_image_url: imageUrl,
        updated_date: new Date().toISOString(),
      })
      .eq('id', tour.id);
    if (error) {
      failed += 1;
      console.warn('Assign failed', tour.id, error.message);
    } else {
      assigned += 1;
      if (assigned % 100 === 0) console.log(`… assigned ${assigned}`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      dryRun,
      replaceAll,
      uploaded,
      assigned,
      failed,
      processed: targetTours.length,
      groups: byGroup.size,
    },
    null,
    2
  )
);
