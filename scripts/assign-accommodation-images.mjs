/**
 * Replace accommodation cover images with unique property structure photos.
 * Skips images already used by another stay (URL + content fingerprint).
 *
 * Usage:
 *   node scripts/assign-accommodation-images.mjs --dry-run
 *   node scripts/assign-accommodation-images.mjs --ensure-unique
 *   node scripts/assign-accommodation-images.mjs --ensure-unique --replace-all
 *   node scripts/assign-accommodation-images.mjs --country Uganda --ensure-unique
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  fetchAll,
  fetchOgImage,
  fingerprintFromUrl,
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

function parkFromStay(stay) {
  const fromCol = String(stay.national_park_name || stay.national_park || '').trim();
  if (fromCol) return fromCol;
  const fromLoc = String(stay.location || '').match(/\b(?:Inside|Edge of|Near|Outside)\s+(.+)$/i);
  return fromLoc?.[1]?.trim() || '';
}

function structureQueries(name, type, country, parkName, variant = 0) {
  const quoted = `"${name}"`;
  const park = parkName ? ` ${parkName}` : '';
  const lower = String(type || '').toLowerCase();
  const suffix = ' -logo -map -watermark -icon -clipart';
  const variants = [];

  if (/tented/i.test(lower)) {
    variants.push(`${quoted}${park} luxury tented camp exterior safari tents ${country}${suffix}`);
    variants.push(`${quoted} tented camp aerial view ${country}${suffix}`);
  } else if (/hotel/i.test(lower)) {
    variants.push(`${quoted}${park} safari hotel building exterior ${country}${suffix}`);
    variants.push(`${quoted} hotel facade ${country}${suffix}`);
  } else if (/banda/i.test(lower)) {
    variants.push(`${quoted}${park} banda lodge exterior building ${country}${suffix}`);
    variants.push(`${quoted} banda cottages ${country}${suffix}`);
  } else {
    variants.push(`${quoted}${park} safari lodge exterior building architecture ${country}${suffix}`);
    variants.push(`${quoted} lodge main building ${country}${suffix}`);
  }

  variants.push(`${quoted}${park} accommodation property photo ${country}${suffix}`);
  variants.push(`${name} ${parkName || country} safari lodge hotel camp exterior${suffix}`);
  variants.push(`${name} ${country} official lodge property${suffix}`);

  return variants[variant % variants.length];
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

function buildDuplicateTargets(stays, ensureUnique) {
  const byFingerprint = new Map();
  for (const stay of stays) {
    const image = String(stay.image_url || '').trim();
    if (!image) continue;
    const fp = fingerprintFromUrl(image);
    if (!byFingerprint.has(fp)) byFingerprint.set(fp, []);
    byFingerprint.get(fp).push(stay);
  }

  const duplicateIds = new Set();
  for (const rows of byFingerprint.values()) {
    if (rows.length < 2) continue;
    for (const stay of rows) duplicateIds.add(stay.id);
  }

  return stays.filter((stay) => {
    if (ensureUnique && duplicateIds.has(stay.id)) return true;
    return stayNeedsReplace(stay);
  });
}

function reserveUniqueFingerprints(stays, targetIds) {
  const usedFingerprints = new Set();
  const usedSourceUrls = new Set();

  const byFingerprint = new Map();
  for (const stay of stays) {
    const image = String(stay.image_url || '').trim();
    if (!image) continue;
    const fp = fingerprintFromUrl(image);
    if (!byFingerprint.has(fp)) byFingerprint.set(fp, []);
    byFingerprint.get(fp).push(stay);
  }

  for (const [fp, rows] of byFingerprint) {
    if (rows.length !== 1) continue;
    const stay = rows[0];
    if (targetIds.has(stay.id)) continue;
    usedFingerprints.add(fp);
  }

  return { usedFingerprints, usedSourceUrls };
}

async function gatherCandidates(stay, catalog, variant = 0) {
  const name = String(stay.name || '').trim();
  const country = String(stay.country || '').trim();
  const type = String(stay.type || 'Safari Lodge').trim();
  const parkName = parkFromStay(stay);
  const location = String(stay.location || '').trim();
  const catalogRow = catalog.get(`${country.toLowerCase()}||${name.toLowerCase()}`);
  const website = String(catalogRow?.website || websiteFromStay(stay) || '').trim();

  const candidates = [];
  if (website) {
    const og = await fetchOgImage(website);
    if (og) candidates.push(og);
    await sleep(180);
  }

  const query = structureQueries(name, type, country, parkName, variant);
  const page = Math.floor(variant / 3) + 1;
  try {
    const results = await searchDuckDuckGoImages(query, 24, page);
    candidates.push(...results.map((item) => item.image));
  } catch {
    /* try fallback query */
    try {
      const fallback = await searchDuckDuckGoImages(
        structureQueries(name, type, country, parkName, variant + 3),
        18,
        page + 1
      );
      candidates.push(...fallback.map((item) => item.image));
    } catch {
      /* ignore */
    }
  }

  if (location && variant % 2 === 1) {
    try {
      const locResults = await searchDuckDuckGoImages(
        `"${name}" ${location} ${country} lodge exterior -logo -watermark`,
        12,
        page
      );
      candidates.push(...locResults.map((item) => item.image));
    } catch {
      /* ignore */
    }
  }

  return candidates;
}

async function resolveStayCover(supabase, stay, catalog, cacheDir, options) {
  const name = String(stay.name || '').trim();
  const country = String(stay.country || '').trim();
  const cacheFile = resolve(cacheDir, `${slugSafe(`${country}-${name}`)}.txt`);
  const { force, usedFingerprints, usedSourceUrls } = options;

  if (!force && existsSync(cacheFile)) {
    const cached = readFileSync(cacheFile, 'utf8').trim();
    if (cached.startsWith('http')) {
      const fp = fingerprintFromUrl(cached);
      if (!usedFingerprints.has(fp)) {
        usedFingerprints.add(fp);
        return cached;
      }
    }
  }

  for (let variant = 0; variant < 6; variant += 1) {
    const candidates = await gatherCandidates(stay, catalog, variant);
    const imageUrl = await resolveImageFromCandidates(supabase, candidates, 'accommodations', {
      usedFingerprints,
      usedSourceUrls,
    });
    if (imageUrl) {
      writeFileSync(cacheFile, imageUrl);
      return imageUrl;
    }
    await sleep(350);
  }

  return '';
}

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const replaceAll = args.includes('--replace-all');
const ensureUnique = args.includes('--ensure-unique') || replaceAll;
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

const cacheDir = resolve(process.cwd(), 'scripts', '.cache', 'accommodation-images-v3');
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

const scoped = stays.filter((stay) => {
  const country = String(stay.country || '').trim();
  if (onlyCountry && country.toLowerCase() !== onlyCountry.toLowerCase()) return false;
  return true;
});

let targets = replaceAll ? scoped : buildDuplicateTargets(scoped, ensureUnique);
if (!replaceAll && !ensureUnique) {
  targets = scoped.filter((stay) => stayNeedsReplace(stay));
}

const toProcess = limit > 0 ? targets.slice(0, limit) : targets;
const targetIds = new Set(toProcess.map((stay) => stay.id));
const { usedFingerprints, usedSourceUrls } = reserveUniqueFingerprints(scoped, targetIds);

console.log(
  `Stays total=${scoped.length}; processing=${toProcess.length}; ensureUnique=${ensureUnique}; dryRun=${dryRun}; reservedFingerprints=${usedFingerprints.size}`
);

let updated = 0;
let failed = 0;
let skippedDuplicate = 0;

for (let index = 0; index < toProcess.length; index += 1) {
  const stay = toProcess[index];
  const name = String(stay.name || '').trim();

  if (dryRun) {
    updated += 1;
    continue;
  }

  try {
    const beforeFingerprints = new Set(usedFingerprints);
    const imageUrl = await resolveStayCover(supabase, stay, catalog, cacheDir, {
      force: force || replaceAll || ensureUnique,
      usedFingerprints,
      usedSourceUrls,
    });
    if (!imageUrl) {
      failed += 1;
      console.warn('No unique image', name);
      continue;
    }

    const fp = fingerprintFromUrl(imageUrl);
    if (beforeFingerprints.has(fp)) {
      skippedDuplicate += 1;
      failed += 1;
      console.warn('Still duplicate after search', name, fp);
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
      if (updated % 25 === 0) console.log(`… updated ${updated}/${toProcess.length}`);
    }
    await sleep(280);
  } catch (error) {
    failed += 1;
    console.warn('Failed', name, error.message);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      dryRun,
      replaceAll,
      ensureUnique,
      updated,
      failed,
      skippedDuplicate,
      processed: toProcess.length,
      uniqueFingerprints: usedFingerprints.size,
    },
    null,
    2
  )
);

if (!dryRun && updated > 0) {
  const refreshed = await fetchAll(supabase, 'accommodations', 'id,image_url');
  const groups = new Map();
  for (const stay of refreshed) {
    const image = String(stay.image_url || '').trim();
    if (!image) continue;
    const fp = fingerprintFromUrl(image);
    groups.set(fp, (groups.get(fp) || 0) + 1);
  }
  const duplicateStays = [...groups.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
  console.log(
    JSON.stringify(
      {
        verify: {
          staysWithImage: refreshed.filter((row) => String(row.image_url || '').trim()).length,
          duplicateFingerprintGroups: [...groups.values()].filter((count) => count > 1).length,
          staysStillSharingFingerprint: duplicateStays,
        },
      },
      null,
      2
    )
  );
}
