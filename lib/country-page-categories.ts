import {
  categoryMatchesCountry,
  categoryPublicSlug,
  countryLabelFromSlug,
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
  if (ta && tb && ta === tb) return true;
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

function tourCategoryLabels(tours: RecordRow[] | null | undefined): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const tour of tours ?? []) {
    const label = pickString(tour, ['category', 'category_name', 'safari_category']).trim();
    if (!label) continue;
    const key = normalizeSlug(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

function synthesizeCategoriesFromTours(countrySlug: string, tours: RecordRow[]): RecordRow[] {
  const countryName = countryLabelFromSlug(countrySlug) || countrySlug;
  return tourCategoryLabels(tours).map((label) => {
    const slug = normalizeSlug(label);
    return {
      name: label,
      title: label,
      slug,
      seo_slug: slug,
      country: countryName,
      status: 'published',
    } as RecordRow;
  });
}

/**
 * Destination pages show only Categories-module rows assigned to this country
 * (country field or country name in the title). If none are assigned, cards are
 * built from this country's Standard tour category labels — never other countries.
 */
export function resolveCountryPageCategories(
  countrySlug: string,
  cmsCategories: RecordRow[] | null | undefined,
  tours?: RecordRow[] | null | undefined
): RecordRow[] {
  try {
    const assigned = dedupeCategories(
      (cmsCategories ?? []).filter((row) => row && categoryMatchesCountry(row, countrySlug))
    );
    if (assigned.length) return assigned;
    return synthesizeCategoriesFromTours(countrySlug, tours ?? []);
  } catch (error) {
    console.warn('[Public] resolveCountryPageCategories failed:', countrySlug, error);
    return synthesizeCategoriesFromTours(countrySlug, tours ?? []);
  }
}
