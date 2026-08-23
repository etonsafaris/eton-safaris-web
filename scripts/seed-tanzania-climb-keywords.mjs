/**
 * Import traveler-intent mountain-climbing keywords for Tanzania.
 *
 * Links phrases to:
 *   country  = Tanzania (countries.name)
 *   category = Tanzania Mountain Climbing Safaris (categories.name / title)
 *
 * Reuses the prepare/merge/write flow from lib/keyword-import.ts
 * via scripts/lib/keyword-scope-seed.mjs.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-tanzania-climb-keywords.mjs
 *   npm run seed:tanzania-climb-keywords
 *
 * Safe to re-run: existing phrases for the same country + category are skipped.
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runKeywordScopeSeed } from './lib/keyword-scope-seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const result = await runKeywordScopeSeed({
    country: 'Tanzania',
    category: 'Tanzania Mountain Climbing Safaris',
    countrySlug: 'tanzania',
    countryTagline: 'Serengeti, Ngorongoro, and Kilimanjaro',
    categorySlug: 'tanzania-mountain-climbing-safaris',
    categoryDescription:
      'Kilimanjaro and Mount Meru climb, hike, and trek packages, routes, cost, and gear.',
    keywordFile: resolve(__dirname, 'data/tanzania-mountain-climbing-keywords.txt'),
    extrasFile: resolve(__dirname, 'data/tanzania-mountain-climbing-extras.txt'),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
