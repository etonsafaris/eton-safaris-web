import { unstable_noStore as noStore } from 'next/cache';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import {
  categoryMatchesCountry,
  matchesCategoryValue,
  matchesCountry,
  publicCountryLabel,
  recordMatchesCountrySlug,
} from '@/lib/country-utils';
import {
  fetchCollectionRecordById,
  fetchCollectionRecords,
  fetchCollectionPage,
  fetchFeaturedTours,
  fetchRecordByPublicSlug,
  fetchStaysForPark,
  fetchToursForCountryLabel,
  findRecordBySlug,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickStoredString,
  pickString,
  publicListColumnsFor,
  TOUR_LIST_COLUMNS,
} from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function listColumns(table: string, aliases: string[] = []) {
  return publicListColumnsFor(table, aliases);
}

export async function loadPublishedRecords(
  table: string,
  aliases: string[] = [],
  options?: { columns?: string }
): Promise<RecordRow[]> {
  noStore();
  try {
    const columns = options?.columns || listColumns(table, aliases);
    const rows = await fetchCollectionRecords(table, aliases, columns ? { columns } : undefined);
    return rows.filter(isPublishedRecord);
  } catch {
    return [];
  }
}

export function findCountryRecord(rows: RecordRow[], slug: string) {
  return rows.find((row) => recordMatchesCountrySlug(row, slug)) || null;
}

export { findRecordBySlug };

export async function loadCmsPage(slug: string) {
  noStore();
  try {
    const columns = listColumns('pages');
    const rows = await fetchCollectionRecords('pages', [], columns ? { columns } : undefined);
    // Need full content for the matched page only.
    const match = matchCmsRecord(rows, slug, pageAliases(slug));
    if (!match || !isPublishedRecord(match)) return null;
    const id = String(match.id || '');
    if (!id) return match;
    const full = await fetchCollectionRecordById('pages', id);
    return full && isPublishedRecord(full) ? full : match;
  } catch {
    return null;
  }
}

export async function loadHomePageData() {
  noStore();
  const parkPage = await fetchCollectionPage('national_park', ['national_parks', 'parks'], {
    columns: listColumns('national_park', ['national_parks', 'parks']),
    limit: 24,
    offset: 0,
  }).catch(() => ({ rows: [] as RecordRow[], total: 0 }));
  const [countries, tours, updates, categories] = await Promise.all([
    loadPublishedRecords('countries'),
    fetchFeaturedTours(24).catch(() => [] as RecordRow[]),
    loadPublishedRecords('safari_updates'),
    loadPublishedRecords('categories'),
  ]);
  return {
    countries,
    tours: tours.slice(0, 24),
    updates: updates.filter((row) => !isLanguagePost(row)).slice(0, 8),
    parks: parkPage.rows.filter(isPublishedRecord).slice(0, 24),
    categories,
  };
}

export async function loadCountryPageData(slug: string) {
  noStore();
  const [countries, categories, parks, places] = await Promise.all([
    loadPublishedRecords('countries'),
    loadPublishedRecords('categories'),
    loadPublishedRecords('national_park', ['national_parks', 'parks']),
    loadPublishedRecords('explore'),
  ]);
  const countryMeta =
    findCountryRecord(countries, slug) || (await fetchRecordByPublicSlug('countries', slug));
  const country =
    countryMeta?.id != null
      ? (await fetchCollectionRecordById('countries', String(countryMeta.id))) || countryMeta
      : countryMeta;
  const countryName =
    (country ? publicCountryLabel(country, slug) : '') ||
    pickString(country || {}, ['name', 'title']) ||
    slug;
  const tours = await fetchToursForCountryLabel(countryName, 120).catch(() => [] as RecordRow[]);
  return {
    country: country && isPublishedRecord(country) ? country : null,
    categories: categories.filter((row) => categoryMatchesCountry(row, slug)),
    tours: tours.filter((row) => matchesCountry(row, slug)),
    parks: parks.filter((row) => matchesCountry(row, slug)),
    places: places.filter((row) => matchesCountry(row, slug)),
  };
}

export async function loadTourDetail(slug: string) {
  noStore();
  const tour = await fetchRecordByPublicSlug('tours', slug);
  if (tour && !isPublishedRecord(tour)) {
    return { tour: null, related: [] as RecordRow[] };
  }
  const country = tour ? pickString(tour, ['country']) : '';
  const category = tour ? pickString(tour, ['category']) : '';
  const relatedPool = country
    ? await fetchToursForCountryLabel(country, 40).catch(() => [] as RecordRow[])
    : [];
  const sameCountry = relatedPool.filter((row) => String(row.id) !== String(tour?.id || ''));
  const sameCategory = category ? sameCountry.filter((row) => matchesCategoryValue(row, category)) : [];
  return {
    tour,
    related: (sameCategory.length ? sameCategory : sameCountry).slice(0, 12),
  };
}

export async function loadParkDetail(slug: string) {
  noStore();
  const [park, parkPage] = await Promise.all([
    fetchRecordByPublicSlug('national_park', slug, ['national_parks', 'parks']),
    fetchCollectionPage('national_park', ['national_parks', 'parks'], { limit: 20, offset: 0 }).catch(() => ({
      rows: [] as RecordRow[],
      total: 0,
    })),
  ]);
  const parkName = park ? getRecordTitle(park) : '';
  const stays = parkName ? await fetchStaysForPark(parkName, 10) : [];
  return {
    park: park && isPublishedRecord(park) ? park : null,
    others: parkPage.rows.filter((row) => String(row.id) !== String(park?.id || '')).slice(0, 20),
    stays,
  };
}
