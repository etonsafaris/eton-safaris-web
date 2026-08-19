import type { RecordRow } from '@/lib/types';
import { getRecordTitle, pickString, slugify } from '@/lib/data';

export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function countryLabelFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function matchesCountry(record: RecordRow, countrySlug: string): boolean {
  const slug = normalizeSlug(countrySlug);
  const candidates = [
    pickString(record, ['country', 'destination', 'country_slug', 'nation']),
    pickString(record, ['slug']),
    pickString(record, ['name']),
  ].filter(Boolean);

  return candidates.some((value) => {
    const normalized = normalizeSlug(value);
    return normalized === slug || normalized.includes(slug) || slug.includes(normalized);
  });
}

export function categoryMatchTokens(category: RecordRow): string[] {
  const tokens = [
    pickString(category, ['id']),
    pickString(category, ['slug']),
    pickString(category, ['name']),
    pickString(category, ['title']),
    categoryPublicSlug(category),
  ]
    .filter(Boolean)
    .map(normalizeSlug)
    .filter(Boolean);
  return Array.from(new Set(tokens));
}

export function recordCategoryTokens(record: RecordRow): string[] {
  const tokens = [
    pickString(record, ['category_id']),
    pickString(record, ['category', 'category_name', 'safari_category']),
    pickString(record, ['category_slug']),
  ]
    .filter(Boolean)
    .map(normalizeSlug)
    .filter(Boolean);
  return Array.from(new Set(tokens));
}

export function matchesCategoryValue(record: RecordRow, value: string): boolean {
  const target = normalizeSlug(value.replace(/-/g, ' '));
  const slugTarget = normalizeSlug(value);
  if (!target && !slugTarget) return true;
  return recordCategoryTokens(record).some(
    (token) => token === target || token === slugTarget || token === normalizeSlug(value)
  );
}

export function matchesCategory(record: RecordRow, category: RecordRow | null): boolean {
  if (!category) return true;
  const categoryTokens = categoryMatchTokens(category);
  const recordTokens = recordCategoryTokens(record);
  if (!recordTokens.length || !categoryTokens.length) return false;
  return recordTokens.some((token) => categoryTokens.includes(token));
}

export function findCategoryBySlug(categories: RecordRow[], slug: string): RecordRow | null {
  const target = normalizeSlug(slug);
  if (!target) return null;
  return (
    categories.find((category) => categoryPublicSlug(category) === target) ||
    categories.find((category) => categoryMatchTokens(category).includes(target)) ||
    null
  );
}

export function findPlaceBySlug(places: RecordRow[], slug: string, countrySlug = ''): RecordRow | null {
  const target = normalizeSlug(slug);
  if (!target) return null;
  const matches = places.filter((place) => {
    const id = String(place.id || '');
    if (id === slug || id === target) return true;
    const candidates = [
      normalizeSlug(pickString(place, ['slug', 'seo_slug'])),
      slugify(getRecordTitle(place)),
    ].filter(Boolean);
    return candidates.includes(target);
  });
  if (countrySlug) {
    const inCountry = matches.filter((place) => matchesCountry(place, countrySlug));
    if (inCountry[0]) return inCountry[0];
  }
  return matches[0] || null;
}

export function filterToursByCategory(
  tours: RecordRow[],
  category: RecordRow | null,
  categorySlug = ''
): RecordRow[] {
  if (category) return tours.filter((tour) => matchesCategory(tour, category));
  if (categorySlug) return tours.filter((tour) => matchesCategoryValue(tour, categorySlug));
  return tours;
}

export function categoryMatchesCountry(category: RecordRow, countrySlug: string): boolean {
  return matchesCountry(category, countrySlug);
}

export function getCategoryKey(record: RecordRow): string {
  return pickString(record, ['id', 'slug', 'name']) || getRecordTitleFallback(record);
}

export function categoryPublicSlug(category: RecordRow): string {
  return normalizeSlug(pickString(category, ['slug']) || pickString(category, ['title', 'name']));
}

export function countryCategoryPath(countrySlug: string, category: RecordRow): string {
  const country = normalizeSlug(countrySlug).replace(/-safaris$/, '');
  return `/${country}-safaris/${categoryPublicSlug(category)}`;
}

function getRecordTitleFallback(record: RecordRow): string {
  const preferred = ['title', 'name', 'label'];
  for (const key of preferred) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return 'item';
}
