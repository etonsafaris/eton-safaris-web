import {
  categoryMatchesCountry,
  categoryPublicSlug,
  matchesCategory,
  normalizeSlug,
} from '@/lib/country-utils';
import { getRecordTitle, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function categorySortKey(row: RecordRow): string {
  return categoryPublicSlug(row) || normalizeSlug(getRecordTitle(row));
}

function categoriesRepresentSame(a: RecordRow, b: RecordRow): boolean {
  const ka = categorySortKey(a);
  const kb = categorySortKey(b);
  if (ka && kb && ka === kb) return true;
  if (a.id != null && b.id != null && String(a.id) === String(b.id)) return true;
  const ta = normalizeSlug(getRecordTitle(a));
  const tb = normalizeSlug(getRecordTitle(b));
  if (ta && tb && (ta === tb || ta.includes(tb) || tb.includes(ta))) return true;
  return false;
}

function dedupeCategories(rows: RecordRow[]): RecordRow[] {
  const out: RecordRow[] = [];
  for (const row of rows) {
    if (!row) continue;
    if (out.some((existing) => categoriesRepresentSame(existing, row))) continue;
    out.push(row);
  }
  return out;
}

function tourCoveredByPool(tour: RecordRow, pool: RecordRow[]): boolean {
  return pool.some((category) => matchesCategory(tour, category));
}

/**
 * Categories on a country page: published CMS rows for this country that have ≥1 tour,
 * plus synthetic rows only when no CMS category matches a tour's activity label.
 */
export function resolveCountryPageCategories(
  countrySlug: string,
  cmsCategories: RecordRow[] | null | undefined,
  tours: RecordRow[] | null | undefined
): RecordRow[] {
  try {
    const pool = dedupeCategories(
      (cmsCategories ?? []).filter((row) => row && categoryMatchesCountry(row, countrySlug))
    );
    const tourList = (tours ?? []).filter(Boolean);
    if (!tourList.length) {
      return pool;
    }

    const withTours = pool.filter((category) => tourList.some((tour) => matchesCategory(tour, category)));
    const seen = new Set(withTours.map((row) => categorySortKey(row)).filter(Boolean));
    const synthetics: RecordRow[] = [];

    for (const tour of tourList) {
      if (tourCoveredByPool(tour, pool)) continue;

      const label = pickString(tour, ['category', 'category_name', 'safari_category']);
      if (!label?.trim()) continue;
      const slug = normalizeSlug(label);
      if (!slug || seen.has(slug)) continue;

      seen.add(slug);
      synthetics.push({
        name: label.trim(),
        title: label.trim(),
        slug,
        country: countrySlug,
        status: 'published',
      } as RecordRow);
    }

    return dedupeCategories([...withTours, ...synthetics]);
  } catch (error) {
    console.warn('[Public] resolveCountryPageCategories failed:', countrySlug, error);
    return dedupeCategories(
      (cmsCategories ?? []).filter((row) => row && categoryMatchesCountry(row, countrySlug))
    );
  }
}
