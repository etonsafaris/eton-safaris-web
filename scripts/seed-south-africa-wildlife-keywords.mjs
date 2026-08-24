/**
 * Import traveler-intent wildlife / safari keywords for South Africa.
 *
 * Links phrases to:
 *   country  = South Africa (countries.name)
 *   category = South Africa Wildlife Safaris (categories.name / title)
 *
 * Reuses the prepare/merge/write flow from lib/keyword-import.ts
 * via scripts/lib/keyword-scope-seed.mjs.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-south-africa-wildlife-keywords.mjs
 *   npm run seed:south-africa-wildlife-keywords
 *
 * Safe to re-run: existing phrases for the same country + category are skipped.
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runKeywordScopeSeed } from './lib/keyword-scope-seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const result = await runKeywordScopeSeed({
    country: 'South Africa',
    category: 'South Africa Wildlife Safaris',
    countrySlug: 'south-africa',
    countryTagline: 'Kruger, Big Five, and malaria-free private reserves',
    categorySlug: 'south-africa-wildlife-safaris',
    categoryDescription:
      'Wildlife safari tours across South Africa, including Kruger National Park, Sabi Sands, Madikwe, Pilanesberg, Addo, Hluhluwe, and private Big Five reserves.',
    keywordFile: resolve(__dirname, 'data/south-africa-wildlife-safari-keywords.txt'),
    extrasFile: resolve(__dirname, 'data/south-africa-wildlife-safari-extras.txt'),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
