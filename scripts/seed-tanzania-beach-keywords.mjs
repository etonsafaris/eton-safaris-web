/**
 * Import traveler-intent beach-holiday keywords for Tanzania.
 *
 * Links phrases to:
 *   country  = Tanzania (countries.name)
 *   category = Tanzania Beach Holidays (categories.name / title)
 *
 * Reuses the prepare/merge/write flow from lib/keyword-import.ts
 * via scripts/lib/keyword-scope-seed.mjs.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-tanzania-beach-keywords.mjs
 *   npm run seed:tanzania-beach-keywords
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
    category: 'Tanzania Beach Holidays',
    countrySlug: 'tanzania',
    countryTagline: 'Serengeti, Ngorongoro, and Kilimanjaro',
    categorySlug: 'tanzania-beach-holidays',
    categoryDescription:
      'Zanzibar, Pemba, and Mafia Island beach holidays, including safari-and-beach add-ons.',
    keywordFile: resolve(__dirname, 'data/tanzania-beach-holiday-keywords.txt'),
    extrasFile: resolve(__dirname, 'data/tanzania-beach-holiday-extras.txt'),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
