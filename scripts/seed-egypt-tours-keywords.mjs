/**
 * Import traveler-intent tour keywords for Egypt.
 *
 * Links phrases to:
 *   country  = Egypt (countries.name)
 *   category = Egypt Tours (categories.name / title)
 *
 * Reuses the prepare/merge/write flow from lib/keyword-import.ts
 * via scripts/lib/keyword-scope-seed.mjs.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-egypt-tours-keywords.mjs
 *   npm run seed:egypt-tours-keywords
 *
 * Safe to re-run: existing phrases for the same country + category are skipped.
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runKeywordScopeSeed } from './lib/keyword-scope-seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const result = await runKeywordScopeSeed({
    country: 'Egypt',
    category: 'Egypt Tours',
    countrySlug: 'egypt',
    countryTagline: 'Pyramids, Nile cruises, Luxor temples, and Red Sea resorts',
    categorySlug: 'egypt-tours',
    categoryDescription:
      'Egypt tour packages including Cairo, Giza pyramids, Luxor, Aswan, Nile cruises, Abu Simbel, Alexandria, Hurghada, Sharm el Sheikh, and desert oases.',
    keywordFile: resolve(__dirname, 'data/egypt-tours-keywords.txt'),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
