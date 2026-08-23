/**
 * Import traveler-intent beach-holiday keywords for Kenya.
 *
 * Links phrases to:
 *   country  = Kenya (countries.name)
 *   category = Kenya Beach Holidays (categories.name / title)
 *
 * Reuses the prepare/merge/write flow from lib/keyword-import.ts
 * via scripts/lib/keyword-scope-seed.mjs.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-kenya-beach-keywords.mjs
 *
 * Safe to re-run: existing phrases for the same country + category are skipped.
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runKeywordScopeSeed } from './lib/keyword-scope-seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const result = await runKeywordScopeSeed({
    country: 'Kenya',
    category: 'Kenya Beach Holidays',
    countrySlug: 'kenya',
    countryTagline: 'Masai Mara, Amboseli, and the Kenyan coast',
    categorySlug: 'kenya-beach-holidays',
    categoryDescription:
      'Diani, Mombasa, Watamu, Malindi, Kilifi, and Lamu beach holidays, including safari-and-beach packages.',
    keywordFile: resolve(__dirname, 'data/kenya-beach-holiday-keywords.txt'),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
