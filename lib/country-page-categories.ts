import {
  categoryMatchesCountry,
  categoryPublicSlug,
  findCategoryBySlug,
  getCategoryKey,
  matchesCategory,
  normalizeSlug,
} from '@/lib/country-utils';
import { getRecordTitle, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function categorySortKey(row: RecordRow): string {
  return categoryPublicSlug(row) || normalizeSlug(getRecordTitle(row)) || getCategoryKey(row);
}

/**
 * Categories shown on a country page: CMS rows for this country that have ≥1 tour,
 * plus synthetic rows for tour.category labels missing from CMS.
 */
export function resolveCountryPageCategories(
  countrySlug: string,
  cmsCategories: RecordRow[] | null | undefined,
  tours: RecordRow[] | null | undefined
): RecordRow[] {
  try {
    const pool = (cmsCategories ?? []).filter((row) => row && categoryMatchesCountry(row, countrySlug));
    const tourList = (tours ?? []).filter(Boolean);
    if (!tourList.length) {
      return pool;
    }

    const ordered: RecordRow[] = [];
    const seen = new Set<string>();

    for (const category of pool) {
      const key = categorySortKey(category);
      if (!key || seen.has(key)) continue;
      const hasTour = tourList.some((tour) => matchesCategory(tour, category));
      if (!hasTour) continue;
      seen.add(key);
      ordered.push(category);
    }

    for (const tour of tourList) {
      const label = pickString(tour, ['category', 'category_name', 'safari_category']);
      if (!label?.trim()) continue;
      const slug = normalizeSlug(label);
      if (!slug) continue;

      const cmsMatch = findCategoryBySlug(pool, slug, countrySlug);
      if (cmsMatch) {
        const key = categorySortKey(cmsMatch);
        if (key && !seen.has(key)) {
          seen.add(key);
          ordered.push(cmsMatch);
        }
        continue;
      }

      if (seen.has(slug)) continue;
      seen.add(slug);
      ordered.push({
        name: label.trim(),
        title: label.trim(),
        slug,
        country: countrySlug,
        status: 'published',
      } as RecordRow);
    }

    return ordered.length ? ordered : pool;
  } catch (error) {
    console.warn('[Public] resolveCountryPageCategories failed:', countrySlug, error);
    return (cmsCategories ?? []).filter((row) => row && categoryMatchesCountry(row, countrySlug));
  }
}
