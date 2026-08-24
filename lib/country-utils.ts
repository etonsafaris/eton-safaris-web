import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import type { RecordRow } from '@/lib/types';
import { getRecordTitle, pickString, slugify } from '@/lib/data';

const COUNTRY_ASSIGNMENT_KEYS = ['country', 'country_slug', 'nation', 'countries'];

const COUNTRY_ALIASES: Record<string, string> = {
  'republic-of-uganda': 'uganda',
  'republic-of-kenya': 'kenya',
  'united-republic-of-tanzania': 'tanzania',
  'republic-of-tanzania': 'tanzania',
  'republic-of-rwanda': 'rwanda',
  'democratic-republic-of-the-congo': 'dr-congo',
  'democratic-republic-of-congo': 'dr-congo',
  drc: 'dr-congo',
  congo: 'dr-congo',
  drcongo: 'dr-congo',
  southafrica: 'south-africa',
  rsa: 'south-africa',
  'republic-of-south-africa': 'south-africa',
};

const KNOWN_COUNTRY_SLUGS = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS].map((item) => item.slug);

export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function canonicalCountrySlug(value: string): string {
  const slug = normalizeSlug(value).replace(/-safaris$/, '');
  if (!slug) return '';
  return COUNTRY_ALIASES[slug] || slug;
}

const MIN_PUBLIC_COUNTRY_SLUG = 3;

function countryNameSlug(record: RecordRow): string {
  return canonicalCountrySlug(pickString(record, ['name', 'title', 'label']));
}

function countryStoredSlug(record: RecordRow): string {
  return canonicalCountrySlug(pickString(record, ['slug', 'seo_slug']));
}

/** Prefer a usable public slug: never let a 1–2 char stored slug hide a real destination name. */
export function countryRecordSlugs(record: RecordRow): string[] {
  const fromName = countryNameSlug(record);
  const stored = countryStoredSlug(record);
  const slugs: string[] = [];
  if (fromName) slugs.push(fromName);
  if (stored && stored !== fromName) slugs.push(stored);
  return slugs;
}

export function publicCountrySlug(record: RecordRow): string {
  const fromName = countryNameSlug(record);
  const stored = countryStoredSlug(record);

  if (fromName && fromName.length >= MIN_PUBLIC_COUNTRY_SLUG) return fromName;
  if (stored && stored.length >= MIN_PUBLIC_COUNTRY_SLUG) return stored;
  if (fromName) return fromName;
  if (stored) return stored;
  return '';
}

export function recordMatchesCountrySlug(record: RecordRow, countrySlug: string): boolean {
  const target = canonicalCountrySlug(countrySlug);
  if (!target) return false;
  if (countryRecordSlugs(record).includes(target)) return true;
  const stored = canonicalCountrySlug(pickString(record, ['slug']));
  return Boolean(stored && stored === target);
}

function splitAssignedCountries(raw: string): string[] {
  return raw
    .split(/[,|/;&]+|\s+and\s+/i)
    .map((part) => canonicalCountrySlug(part.trim()))
    .filter(Boolean);
}

export function recordCountryValues(record: RecordRow): string[] {
  const values = COUNTRY_ASSIGNMENT_KEYS.flatMap((key) => {
    const raw = pickString(record, [key]);
    return raw ? splitAssignedCountries(raw) : [];
  });
  return Array.from(new Set(values));
}

function knownCountriesNamedIn(value: string): string[] {
  const slug = normalizeSlug(value).replace(/-safaris$/, '');
  if (!slug) return [];
  const padded = `-${slug}-`;
  const found: string[] = [];

  for (const country of KNOWN_COUNTRY_SLUGS) {
    if (slug === country || padded.includes(`-${country}-`)) found.push(country);
  }

  for (const [alias, canon] of Object.entries(COUNTRY_ALIASES)) {
    if ((slug === alias || padded.includes(`-${alias}-`)) && !found.includes(canon)) {
      found.push(canon);
    }
  }

  return found;
}

export function countryLabelFromSlug(slug: string): string {
  const key = canonicalCountrySlug(slug);
  if (!key) return '';
  const known = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS].find((item) => item.slug === key);
  if (known) return known.name;
  return key
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Full destination label for public links — never a 1-letter slug fragment. */
export function publicCountryLabel(record: RecordRow | null | undefined, slugFallback = ''): string {
  if (record) {
    const name = pickString(record, ['name']);
    if (name.length >= 2) return name;
    const title = pickString(record, ['title', 'label', 'country', 'destination']);
    if (title.length >= 3) return title;
    if (name) return name;
    if (title) return title;
  }
  const fromSlug = countryLabelFromSlug(slugFallback || publicCountrySlug(record || {}));
  return fromSlug || 'Destination';
}

export function matchesCountry(record: RecordRow, countrySlug: string): boolean {
  const target = canonicalCountrySlug(countrySlug);
  if (!target) return false;
  const candidates = [
    ...recordCountryValues(record),
    canonicalCountrySlug(pickString(record, ['slug'])),
    ...knownCountriesNamedIn(pickString(record, ['name', 'title'])),
  ].filter(Boolean);
  return candidates.includes(target);
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

export function findCategoryBySlug(
  categories: RecordRow[],
  slug: string,
  countrySlug = ''
): RecordRow | null {
  const target = normalizeSlug(slug);
  if (!target) return null;

  const country = canonicalCountrySlug(countrySlug);
  const pool = country
    ? categories.filter((category) => categoryMatchesCountry(category, country))
    : categories;

  const exact = pool.find((category) => categoryPublicSlug(category) === target);
  if (exact) return exact;

  const soft = pool.find((category) => categoryMatchTokens(category).includes(target));
  if (soft) return soft;

  // Never fall back to another country's category when a country root was requested.
  if (country) return null;

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
  const target = canonicalCountrySlug(countrySlug);
  if (!target) return false;

  const assigned = recordCountryValues(category);
  if (assigned.length) return assigned.includes(target);

  const named = [pickString(category, ['name', 'title']), pickString(category, ['slug'])]
    .filter(Boolean)
    .flatMap(knownCountriesNamedIn);
  return named.includes(target);
}

export function getCategoryKey(record: RecordRow): string {
  return pickString(record, ['id', 'slug', 'name']) || getRecordTitleFallback(record);
}

export function categoryPublicSlug(category: RecordRow): string {
  const fromSlug = normalizeSlug(pickString(category, ['slug']));
  const fromName = normalizeSlug(pickString(category, ['title', 'name']));
  if (fromSlug && fromSlug.length >= MIN_PUBLIC_COUNTRY_SLUG) return fromSlug;
  if (fromName) return fromName;
  return fromSlug || fromName;
}

export function countryCategoryPath(countrySlug: string, category: RecordRow): string {
  const country =
    canonicalCountrySlug(countrySlug) ||
    normalizeSlug(countrySlug).replace(/-safaris$/, '') ||
    publicCountrySlug({ name: countrySlug, slug: countrySlug } as RecordRow);
  const categorySlug = categoryPublicSlug(category);
  if (!country || !categorySlug) return country ? `/${country}-safaris` : '/tours';
  return `/${country}-safaris/${categorySlug}`;
}

function getRecordTitleFallback(record: RecordRow): string {
  const preferred = ['title', 'name', 'label'];
  for (const key of preferred) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return 'item';
}
