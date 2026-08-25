/**
 * Seed one remaining-country keyword scope with public SEO injection.
 * Prefer the batch runner:
 *   npm run seed:remaining-country-keywords
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runKeywordScopeSeed } from './lib/keyword-scope-seed.mjs';
import { REMAINING_SCOPES } from './lib/keyword-universe.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const slug = String(process.argv[2] || '').trim().toLowerCase();
const scope = REMAINING_SCOPES.find(
  (item) => item.countrySlug === slug || item.categorySlug === slug || item.country.toLowerCase() === slug
);

if (!scope) {
  console.error(
    `Usage: node scripts/seed-remaining-country-keywords.mjs <country-slug>\nAvailable: ${REMAINING_SCOPES.map((item) => item.countrySlug).join(', ')}`
  );
  process.exit(1);
}

try {
  const result = await runKeywordScopeSeed({
    country: scope.country,
    category: scope.category,
    countrySlug: scope.countrySlug,
    countryTagline: scope.countryTagline,
    categorySlug: scope.categorySlug,
    categoryDescription: scope.categoryDescription,
    keywordFile: resolve(__dirname, 'data', scope.keywordFile),
    injectFocusKeywords: true,
    focusKeywordLimit: 400,
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
