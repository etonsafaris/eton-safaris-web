/**
 * Replace national park cover images with clean landscape photos (no watermarks/logos).
 *
 * Usage:
 *   node scripts/assign-park-images.mjs --dry-run
 *   node scripts/assign-park-images.mjs --replace-all
 *   node scripts/assign-park-images.mjs --country Uganda --replace-all
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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

const cacheDir = resolve(process.cwd(), 'scripts', '.cache', 'park-images-v2');
mkdirSync(cacheDir, { recursive: true });

const parks = await fetchAll(supabase, 'national_park', 'id,name,country,location,image_url,social_image_url');

const targets = parks.filter((park) => {
  const country = String(park.country || '').trim();
  if (onlyCountry && country.toLowerCase() !== onlyCountry.toLowerCase()) return false;
  if (replaceAll) return true;
  const image = String(park.image_url || '').trim();
  return !image || imageLooksRisky(image) || !/\.webp/i.test(image);
});

const toProcess = limit > 0 ? targets.slice(0, limit) : targets;
console.log(`Parks total=${parks.length}; processing=${toProcess.length}; dryRun=${dryRun}`);

let updated = 0;
let failed = 0;

for (const park of toProcess) {
  const name = String(park.name || '').trim();
  const country = String(park.country || '').trim();
  if (!name) continue;

  const cacheFile = resolve(cacheDir, `${slugSafe(`${country}-${name}`)}.txt`);
  let imageUrl = '';
  if (!force && existsSync(cacheFile)) {
    const cached = readFileSync(cacheFile, 'utf8').trim();
    if (cached.startsWith('http')) imageUrl = cached;
  }

  if (!imageUrl && !dryRun) {
    const query = `${name} ${country} national park landscape wildlife scenery photograph -logo -watermark -stamp`;
    const candidates = [];
    try {
      const results = await searchDuckDuckGoImages(query, 10);
      candidates.push(...results.map((item) => item.image));
    } catch (error) {
      console.warn('Search failed', name, error.message);
    }

    imageUrl = await resolveImageFromCandidates(supabase, candidates, 'national-parks');
    if (imageUrl) writeFileSync(cacheFile, imageUrl);
    await sleep(500);
  }

  if (dryRun) {
    console.log(`[dry-run] ${name} (${country})`);
    updated += 1;
    continue;
  }

  if (!imageUrl) {
    failed += 1;
    console.warn('No image', name);
    continue;
  }

  const { error } = await supabase
    .from('national_park')
    .update({
      image_url: imageUrl,
      social_image_url: imageUrl,
      updated_date: new Date().toISOString(),
    })
    .eq('id', park.id);

  if (error) {
    failed += 1;
    console.warn('Update failed', name, error.message);
  } else {
    updated += 1;
    if (updated % 25 === 0) console.log(`… updated ${updated}/${toProcess.length}`);
  }
}

console.log(JSON.stringify({ ok: true, dryRun, updated, failed, processed: toProcess.length }, null, 2));
