/**
 * Replace accommodation cover images with real property structure photos (lodge/hotel/camp exterior).
 * Uses official website og:image first, then targeted image search. Uploads optimized WebP.
 *
 * Usage:
 *   node scripts/assign-accommodation-images.mjs --dry-run
 *   node scripts/assign-accommodation-images.mjs --replace-all
 *   node scripts/assign-accommodation-images.mjs --country Uganda --replace-all --limit 50
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  fetchAll,
  fetchOgImage,
  imageLooksRisky,
  loadEnv,
  resolveImageFromCandidates,
  searchDuckDuckGoImages,
  sleep,
  slugSafe,
} from './lib/image-assign.mjs';

function loadRealCatalog() {
  const dir = resolve(process.cwd(), 'data');
  if (!existsSync(dir)) return new Map();
  const files = readdirSync(dir).filter((f) => f.startsWith('real-park-accommodations-') && f.endsWith('.json'));
  const map = new Map();
  for (const file of files) {
    const rows = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const name = String(row.name || '').trim();
      const country = String(row.country || '').trim();
      if (!name || !country) continue;
      map.set(`${country.toLowerCase()}||${name.toLowerCase()}`, row);
    }
  }
  return map;
}

function websiteFromStay(stay) {
  const embed = String(stay.description || '').match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (embed) {
    try {
      const payload = JSON.parse(decodeURIComponent(embed[1]));
      const url = payload?.fields?.website;
      if (url) return String(url).trim();
    } catch {
      /* ignore */
    }
  }
  return String(stay.website || stay.website_url || '').trim();
}

function structureQuery(name, type, country, parkName) {
  const quoted = `"${name}"`;
  const park = parkName ? ` ${parkName}` : '';
  const lower = String(type || '').toLowerCase();
  if (/tented/i.test(lower)) {
    return `${quoted}${park} luxury tented camp exterior safari tents ${country} -logo -map -watermark`;
  }
  if (/hotel/i.test(lower)) {
    return `${quoted}${park} safari hotel building exterior ${country} -logo -map -watermark`;
  }
  if (/banda/i.test(lower)) {
    return `${quoted}${park} banda lodge exterior building ${country} -logo -map -watermark`;
  }
  return `${quoted}${park} safari lodge exterior building architecture ${country} -logo -map -watermark`;
}

function stayNeedsReplace(stay) {
  const image = String(stay.image_url || '').trim();
  if (!image) return true;
  if (imageLooksRisky(image)) return true;
  if (/national-parks\//i.test(image)) return true;
  if (/base44/i.test(image)) return true;
  if (!/accommodations\//i.test(image)) return true;
  if (!/\.webp/i.test(image)) return true;
  return false;
}

function parkFromStay(stay) {
  const fromCol = String(stay.national_park_name || stay.national_park || '').trim();
  if (fromCol) return fromCol;
  const fromLoc = String(stay.location || '').match(/\b(?:Inside|Edge of|Near|Outside)\s+(.+)$/i);
  return fromLoc?.[1]?.trim() || '';
}

async function resolveStayCover(supabase, stay, catalog, cacheDir, force) {
  const name = String(stay.name || '').trim();
  const country = String(stay.country || '').trim();
  const type = String(stay.type || 'Safari Lodge').trim();
  const parkName = parkFromStay(stay);
  const cacheFile = resolve(cacheDir, `${slugSafe(`${country}-${name}`)}.txt`);

  if (!force && existsSync(cacheFile)) {
    const cached = readFileSync(cacheFile, 'utf8').trim();
    if (cached.startsWith('http')) return cached;
  }

  const catalogRow = catalog.get(`${country.toLowerCase()}||${name.toLowerCase()}`);
  const website = String(catalogRow?.website || websiteFromStay(stay) || '').trim();

  const candidates = [];
  if (website) {
    const og = await fetchOgImage(website);
    if (og) candidates.push(og);
    await sleep(200);
  }

  try {
    const results = await searchDuckDuckGoImages(structureQuery(name, type, country, parkName), 8);
    candidates.push(...results.map((item) => item.image));
  } catch {
    /* fallback query */
    try {
      const fallback = await searchDuckDuckGoImages(
        `${name} ${country} lodge hotel exterior building -logo -watermark`,
        6
      );
      candidates.push(...fallback.map((item) => item.image));
    } catch {
      /* ignore */
    }
  }

  const imageUrl = await resolveImageFromCandidates(supabase, candidates, 'accommodations');
  if (imageUrl) writeFileSync(cacheFile, imageUrl);
  return imageUrl;
}

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const replaceAll = args.includes('--replace-all');
const force = args.includes('--force');
const countryIdx = args.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(args[countryIdx + 1] || '').trim() : '';
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 0 : 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const cacheDir = resolve(process.cwd(), 'scripts', '.cache', 'accommodation-images-v2');
mkdirSync(cacheDir, { recursive: true });
const catalog = loadRealCatalog();
console.log(`Real catalog entries: ${catalog.size}`);

const columnSets = [
  'id,name,country,type,location,national_park_name,description,image_url,social_image_url,website,website_url',
  'id,name,country,type,location,description,image_url,social_image_url',
];

let stays = [];
for (const columns of columnSets) {
  try {
    stays = await fetchAll(supabase, 'accommodations', columns);
    break;
  } catch (error) {
    if (!/column .* does not exist/i.test(String(error.message || ''))) throw error;
  }
}

const targets = stays.filter((stay) => {
  const country = String(stay.country || '').trim();
  if (onlyCountry && country.toLowerCase() !== onlyCountry.toLowerCase()) return false;
  if (replaceAll) return true;
  return stayNeedsReplace(stay);
});

const toProcess = limit > 0 ? targets.slice(0, limit) : targets;
console.log(`Stays total=${stays.length}; processing=${toProcess.length}; dryRun=${dryRun}`);

let updated = 0;
let failed = 0;
const CONCURRENCY = 5;
let cursor = 0;

async function worker() {
  while (cursor < toProcess.length) {
    const index = cursor;
    cursor += 1;
    const stay = toProcess[index];
    const name = String(stay.name || '').trim();

    if (dryRun) {
      updated += 1;
      continue;
    }

    try {
      const imageUrl = await resolveStayCover(supabase, stay, catalog, cacheDir, force);
      if (!imageUrl) {
        failed += 1;
        console.warn('No image', name);
        continue;
      }

      const { error } = await supabase
        .from('accommodations')
        .update({
          image_url: imageUrl,
          social_image_url: imageUrl,
          updated_date: new Date().toISOString(),
        })
        .eq('id', stay.id);

      if (error) {
        failed += 1;
        console.warn('Update failed', name, error.message);
      } else {
        updated += 1;
        if (updated % 50 === 0) console.log(`… updated ${updated}/${toProcess.length}`);
      }
      await sleep(300);
    } catch (error) {
      failed += 1;
      console.warn('Failed', name, error.message);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

console.log(JSON.stringify({ ok: true, dryRun, updated, failed, processed: toProcess.length }, null, 2));
