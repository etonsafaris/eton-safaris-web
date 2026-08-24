/**
 * Import traveler-intent wildlife / safari keywords for Malawi.
 *
 * Links phrases to:
 *   country  = Malawi (countries.name)
 *   category = Malawi Wildlife Safaris (categories.name / title)
 *
 * Reuses the prepare/merge/write flow from lib/keyword-import.ts
 * via scripts/lib/keyword-scope-seed.mjs.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-malawi-wildlife-keywords.mjs
 *   npm run seed:malawi-wildlife-keywords
 *
 * Safe to re-run: existing phrases for the same country + category are skipped.
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runKeywordScopeSeed } from './lib/keyword-scope-seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const result = await runKeywordScopeSeed({
    country: 'Malawi',
    category: 'Malawi Wildlife Safaris',
    countrySlug: 'malawi',
    countryTagline: 'Majete, Liwonde, Nyika, and Lake Malawi bush-and-beach safaris',
    categorySlug: 'malawi-wildlife-safaris',
    categoryDescription:
      'Wildlife safari tours across Malawi, including Majete Wildlife Reserve, Liwonde National Park, Nyika Plateau, Nkhotakota, and Lake Malawi bush-and-beach itineraries.',
    keywordFile: resolve(__dirname, 'data/malawi-wildlife-safari-keywords.txt'),
    extrasFile: resolve(__dirname, 'data/malawi-wildlife-safari-extras.txt'),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
