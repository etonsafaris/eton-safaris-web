import { categoryMatchesCountry, categoryPublicSlug, normalizeSlug } from '@/lib/country-utils';
import { getRecordTitle } from '@/lib/data';
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

/**
 * Country destination page: only published categories assigned to this country in admin.
 * No synthetic categories from tour labels — if it is not in the Categories module, it is not shown.
 */
export function resolveCountryPageCategories(
  countrySlug: string,
  cmsCategories: RecordRow[] | null | undefined,
  _tours?: RecordRow[] | null | undefined
): RecordRow[] {
  try {
    return dedupeCategories(
      (cmsCategories ?? []).filter((row) => row && categoryMatchesCountry(row, countrySlug))
    );
  } catch (error) {
    console.warn('[Public] resolveCountryPageCategories failed:', countrySlug, error);
    return [];
  }
}
