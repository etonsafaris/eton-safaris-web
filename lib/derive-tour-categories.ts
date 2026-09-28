import { getRecordTitle, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

/** Build activity dropdown options when CMS `categories` rows are empty or unpublished. */
export function deriveCategoriesFromTours(
  cmsCategories: RecordRow[],
  tours: RecordRow[]
): RecordRow[] {
  if (cmsCategories?.length) return cmsCategories;
  const seen = new Set<string>();
  const derived: RecordRow[] = [];
  for (const tour of tours ?? []) {
    const label = pickString(tour, ['category', 'category_name', 'safari_category']).trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    derived.push({ id: `tour-cat-${derived.length}`, name: label, title: label, status: 'published' });
  }
  return derived.sort((a, b) => getRecordTitle(a).localeCompare(getRecordTitle(b)));
}
