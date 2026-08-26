/**
 * Download real photos via DuckDuckGo image search and attach to tour packages.
 * Builds a per-category image pool, uploads to Supabase Storage, then assigns covers.
 *
 * Usage:
 *   node scripts/assign-tour-images-from-ddg.mjs --dry-run
 *   node scripts/assign-tour-images-from-ddg.mjs --limit 50
 *   node scripts/assign-tour-images-from-ddg.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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

function searchQueryFor(country, category) {
  const topic = String(category || '')
    .replace(new RegExp(country, 'ig'), '')
    .replace(/\b(safaris|safari|tours|tour|holidays|holiday|packages|package)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/gorilla/i.test(category)) return `${country} mountain gorilla rainforest wildlife photograph -logo -watermark`;
  if (/beach/i.test(category)) return `${country} tropical beach coastline scenic photograph -logo -watermark`;
  if (/climb|mountain/i.test(category)) return `${country} mountain trekking landscape scenic photograph -logo -watermark`;
  if (/wildlife|safari/i.test(category)) return `${country} African wildlife savannah game drive photograph -logo -watermark`;
  return `${country} ${topic || 'safari'} nature landscape photograph -logo -watermark`;
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
    .filter((item) => !/logo|watermark|stamp|banner|flyer|brochure|badge/i.test(`${item.title} ${item.source} ${item.image}`))
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

function extensionFor(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

async function uploadBuffer(supabase, buffer, contentType, folder) {
  const buckets = ['media', 'images', 'uploads', 'public'];
  const ext = extensionFor(contentType);
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

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 0 : 0;
const force = args.includes('--force');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const cacheDir = resolve(process.cwd(), 'scripts', '.cache', 'ddg-images');
mkdirSync(cacheDir, { recursive: true });

const tours = await fetchAll(
  supabase,
  'tours',
  'id,title,country,category,image_url,social_image_url,seo_title,meta_description,slug'
);

const needsImage = tours.filter((tour) => force || !String(tour.image_url || '').trim());
const targetTours = limit > 0 ? needsImage.slice(0, limit) : needsImage;
console.log(`Tours needing images: ${needsImage.length}; processing: ${targetTours.length}; dryRun=${dryRun}`);

const byCategory = new Map();
for (const tour of targetTours) {
  const key = `${String(tour.country || '').trim()}||${String(tour.category || '').trim()}`;
  if (!byCategory.has(key)) byCategory.set(key, []);
  byCategory.get(key).push(tour);
}

const poolByCategory = new Map();
let uploaded = 0;
let assigned = 0;
let failed = 0;

for (const [key, group] of byCategory) {
  const [country, category] = key.split('||');
  const query = searchQueryFor(country, category);
  const needed = Math.min(24, Math.max(8, Math.ceil(group.length / 5)));
  console.log(`\nPool for ${country} / ${category} → "${query}" (need ~${needed})`);

  const cacheFile = resolve(cacheDir, `${slugSafe(key)}.json`);
  let urls = [];
  if (!force && existsSync(cacheFile)) {
    try {
      urls = JSON.parse(readFileSync(cacheFile, 'utf8'));
    } catch {
      urls = [];
    }
  }

  if ((force || urls.length < needed) && !dryRun) {
    urls = [];
    try {
      const results = await searchDuckDuckGoImages(query, needed + 10);
      for (const result of results) {
        if (urls.length >= needed) break;
        try {
          const { buffer, contentType } = await downloadImage(result.image);
          const publicUrl = await uploadBuffer(supabase, buffer, contentType, 'tours');
          urls.push(publicUrl);
          uploaded += 1;
          console.log(`  uploaded ${urls.length}/${needed}`);
          await sleep(400);
        } catch (error) {
          console.warn('  skip image:', error.message);
        }
      }
      writeFileSync(cacheFile, JSON.stringify(urls, null, 2));
      await sleep(800);
    } catch (error) {
      console.warn('  search failed:', error.message);
    }
  } else if (dryRun) {
    console.log(`  [dry-run] would search DDG and build pool of ${needed}`);
  }

  poolByCategory.set(key, urls);
}

function slugSafe(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

for (const [key, group] of byCategory) {
  const pool = poolByCategory.get(key) || [];
  if (!pool.length && !dryRun) {
    console.warn(`No images for ${key}; skipping ${group.length} tours`);
    failed += group.length;
    continue;
  }
  for (let i = 0; i < group.length; i += 1) {
    const tour = group[i];
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
      if (assigned % 50 === 0) console.log(`… assigned ${assigned}`);
    }
  }
}

console.log(JSON.stringify({ ok: true, dryRun, uploaded, assigned, failed, processed: targetTours.length }, null, 2));
