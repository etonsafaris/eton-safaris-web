/**
 * Replace duplicate accommodation images with real facility photos.
 * 1) Official property website images for catalog / embedded-website stays
 * 2) Property-specific search with per-stay rotation for generated names
 *
 *   node scripts/fix-stay-duplicate-images.mjs
 *   node scripts/fix-stay-duplicate-images.mjs --country Uganda
 *   node scripts/fix-stay-duplicate-images.mjs --limit 100
 */
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  fetchAll,
  fetchWebsiteFacilityImages,
  fingerprintFromUrl,
  loadEnv,
  resolveImageFromCandidates,
  searchDuckDuckGoImages,
  sleep,
} from './lib/image-assign.mjs';

function loadCatalog() {
  const dir = resolve(process.cwd(), 'data');
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.startsWith('real-park-accommodations-') && f.endsWith('.json'))) {
    for (const row of JSON.parse(readFileSync(resolve(dir, file), 'utf8'))) {
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
  return String(
    stay.national_park_name || stay.national_park || stay.park_name || stay.park || ''
  ).trim();
}

function duplicateStayIds(stays) {
  const groups = new Map();
  for (const stay of stays) {
    const image = String(stay.image_url || '').trim();
    if (!image) continue;
    const fp = fingerprintFromUrl(image);
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp).push(stay);
  }
  const ids = new Set();
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    for (const stay of rows) ids.add(stay.id);
  }
  return ids;
}

function reserveUniqueFingerprints(stays, targetIds) {
  const usedFingerprints = new Set();
  const usedSourceUrls = new Set();
  const groups = new Map();
  for (const stay of stays) {
    const image = String(stay.image_url || '').trim();
    if (!image) continue;
    const fp = fingerprintFromUrl(image);
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp).push(stay);
  }
  for (const [fp, rows] of groups) {
    if (rows.length !== 1) continue;
    if (targetIds.has(rows[0].id)) continue;
    usedFingerprints.add(fp);
  }
  return { usedFingerprints, usedSourceUrls };
}

function rotateCandidates(candidates, stayId) {
  if (!candidates.length) return [];
  const offset = parseInt(createHash('sha1').update(String(stayId)).digest('hex').slice(0, 8), 16);
  const start = offset % candidates.length;
  return [...candidates.slice(start), ...candidates.slice(0, start)];
}

async function facilityCandidates(stay, catalog) {
  const name = String(stay.name || '').trim();
  const country = String(stay.country || '').trim();
  const type = String(stay.type || 'Safari Lodge').trim();
  const park = parkFromStay(stay);
  const catalogRow = catalog.get(`${country.toLowerCase()}||${name.toLowerCase()}`);
  const website = String(catalogRow?.website || websiteFromStay(stay) || '').trim();

  const candidates = [];
  if (website) {
    candidates.push(...(await fetchWebsiteFacilityImages(website)));
    await sleep(150);
  }

  const queries = [
    `"${name}" ${park} ${type} lodge exterior building ${country} -logo -watermark`,
    `"${name}" ${country} safari lodge hotel camp facility -logo -watermark`,
    `${name} ${park || country} accommodation property photo exterior`,
  ];

  for (let index = 0; index < queries.length; index += 1) {
    try {
      const results = await searchDuckDuckGoImages(queries[index], 28, index + 1);
      candidates.push(...results.map((item) => item.image));
      await sleep(250);
    } catch {
      /* try next query */
    }
  }

  return rotateCandidates([...new Set(candidates)], stay.id);
}

async function resolveFacilityCover(supabase, stay, catalog, usedFingerprints, usedSourceUrls) {
  const candidates = await facilityCandidates(stay, catalog);
  return resolveImageFromCandidates(supabase, candidates, 'accommodations', {
    usedFingerprints,
    usedSourceUrls,
  });
}

loadEnv();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const countryIdx = args.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(args[countryIdx + 1] || '').trim() : '';
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 0 : 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

mkdirSync(resolve(process.cwd(), 'scripts', '.cache'), { recursive: true });
const catalog = loadCatalog();

const columnSets = [
  'id,name,country,type,location,national_park_name,national_park,park_name,park,description,image_url,website,website_url',
  'id,name,country,type,location,description,image_url',
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

const duplicateIds = duplicateStayIds(scoped);
let targets = scoped.filter((stay) => duplicateIds.has(stay.id));
targets.sort((a, b) => {
  const aCatalog = catalog.has(`${String(a.country).toLowerCase()}||${String(a.name).toLowerCase()}`) ? 0 : 1;
  const bCatalog = catalog.has(`${String(b.country).toLowerCase()}||${String(b.name).toLowerCase()}`) ? 0 : 1;
  if (aCatalog !== bCatalog) return aCatalog - bCatalog;
  return String(a.name).localeCompare(String(b.name));
});

const toProcess = limit > 0 ? targets.slice(0, limit) : targets;
const targetIds = new Set(toProcess.map((stay) => stay.id));
const { usedFingerprints, usedSourceUrls } = reserveUniqueFingerprints(scoped, targetIds);

console.log(
  `Duplicate stays=${duplicateIds.size}; processing=${toProcess.length}; catalog=${catalog.size}; dryRun=${dryRun}`
);

let updated = 0;
let failed = 0;

for (let index = 0; index < toProcess.length; index += 1) {
  const stay = toProcess[index];
  const name = String(stay.name || '').trim();

  if (dryRun) {
    updated += 1;
    continue;
  }

  try {
    const before = new Set(usedFingerprints);
    const imageUrl = await Promise.race([
      resolveFacilityCover(supabase, stay, catalog, usedFingerprints, usedSourceUrls),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out after 75s')), 75_000)),
    ]);

    if (!imageUrl) {
      failed += 1;
      console.warn('No facility image', name);
      continue;
    }

    const fp = fingerprintFromUrl(imageUrl);
    if (before.has(fp)) {
      failed += 1;
      console.warn('Could not find unique facility image', name);
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
      if (updated % 10 === 0) console.log(`… updated ${updated}/${toProcess.length}`);
    }
  } catch (error) {
    failed += 1;
    console.warn('Failed', name, error instanceof Error ? error.message : String(error));
  }
}

const refreshed = await fetchAll(supabase, 'accommodations', 'id,image_url');
const groups = new Map();
for (const stay of refreshed) {
  const image = String(stay.image_url || '').trim();
  if (!image) continue;
  const fp = fingerprintFromUrl(image);
  groups.set(fp, (groups.get(fp) || 0) + 1);
}
const duplicateGroups = [...groups.values()].filter((count) => count > 1).length;
const duplicateStays = [...groups.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0);

console.log(
  JSON.stringify(
    {
      ok: true,
      dryRun,
      updated,
      failed,
      processed: toProcess.length,
      remainingDuplicateGroups: duplicateGroups,
      remainingDuplicateStays: duplicateStays,
    },
    null,
    2
  )
);
