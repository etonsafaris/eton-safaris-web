/**
 * Import traveler-intent tour keywords for Morocco.
 *
 * Links phrases to:
 *   country  = Morocco (countries.name)
 *   category = Morocco Tours (categories.name / title)
 *
 * Reuses the prepare/merge/write flow from lib/keyword-import.ts
 * via scripts/lib/keyword-scope-seed.mjs.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-morocco-tours-keywords.mjs
 *   npm run seed:morocco-tours-keywords
 *
 * Safe to re-run: existing phrases for the same country + category are skipped.
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runKeywordScopeSeed } from './lib/keyword-scope-seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const result = await runKeywordScopeSeed({
    country: 'Morocco',
    category: 'Morocco Tours',
    countrySlug: 'morocco',
    countryTagline: 'Imperial cities, Atlas mountains, and Sahara desert',
    categorySlug: 'morocco-tours',
    categoryDescription:
      'Morocco tours including Marrakech, Fes, Casablanca, Chefchaouen, Essaouira, Atlas treks, and Sahara desert experiences.',
    keywordFile: resolve(__dirname, 'data/morocco-tours-keywords.txt'),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
