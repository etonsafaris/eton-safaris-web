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

function categoryMatchesTourLabel(category: RecordRow, label: string): boolean {
  const target = normalizeSlug(label);
  if (!target) return false;
  const tokens = [
    categoryPublicSlug(category),
    normalizeSlug(pickString(category, ['slug', 'seo_slug', 'name', 'title'])),
  ].filter(Boolean);
  if (tokens.some((token) => token === target || token.includes(target) || target.includes(token))) {
    return true;
  }
  const targetParts = target.split('-').filter((part) => part.length > 3);
  if (targetParts.length < 2) return false;
  return tokens.some((token) => {
    const parts = new Set(token.split('-').filter((part) => part.length > 3));
    const hits = targetParts.filter((part) => parts.has(part)).length;
    return hits >= Math.min(2, targetParts.length);
  });
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
 * Country destination page categories.
 * Prefer Categories-module rows for this country; also keep CMS rows whose
 * titles match the Standard Tours on this page. If none are assigned, build
 * cards from the distinct tour category labels so the section never blanks.
 */
export function resolveCountryPageCategories(
  countrySlug: string,
  cmsCategories: RecordRow[] | null | undefined,
  tours?: RecordRow[] | null | undefined
): RecordRow[] {
  try {
    const pool = (cmsCategories ?? []).filter(Boolean);
    const byCountry = pool.filter((row) => categoryMatchesCountry(row, countrySlug));
    const labels = tourCategoryLabels(tours);
    const countryName = countryLabelFromSlug(countrySlug) || countrySlug;
    const countryToken = normalizeSlug(countryName);

    const byName = pool.filter((row) => {
      if (byCountry.some((existing) => categoriesRepresentSame(existing, row))) return false;
      const title = normalizeSlug(getRecordTitle(row));
      if (countryToken && title.includes(countryToken)) return true;
      return labels.some((label) => categoryMatchesTourLabel(row, label));
    });

    const merged = dedupeCategories([...byCountry, ...byName]);
    if (merged.length) return merged;

    return synthesizeCategoriesFromTours(countrySlug, tours ?? []);
  } catch (error) {
    console.warn('[Public] resolveCountryPageCategories failed:', countrySlug, error);
    return synthesizeCategoriesFromTours(countrySlug, tours ?? []);
  }
}
