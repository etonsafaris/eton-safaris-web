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
  const [countries, tours, updates, parks, categories] = await Promise.all([
    loadPublishedRecords('countries'),
    fetchFeaturedTours(24).catch(() => [] as RecordRow[]),
    loadPublishedRecords('safari_updates'),
    loadPublishedRecords('national_park', ['national_parks', 'parks']),
    loadPublishedRecords('categories'),
  ]);
  return {
    countries,
    tours: tours.slice(0, 24),
    updates: updates.filter((row) => !isLanguagePost(row)).slice(0, 8),
    parks: parks.slice(0, 24),
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
  const countryMeta = findCountryRecord(countries, slug);
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
  const tourMeta =
    (await fetchRecordByPublicSlug('tours', slug, [], TOUR_LIST_COLUMNS)) ||
    findRecordBySlug(
      (
        await fetchCollectionPage('tours', [], {
          columns: TOUR_LIST_COLUMNS,
          limit: 200,
          offset: 0,
        })
      ).rows,
      slug
    );
  const tour =
    tourMeta?.id != null
      ? (await fetchCollectionRecordById('tours', String(tourMeta.id))) || tourMeta
      : tourMeta;
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
  const [parksLight, accommodations] = await Promise.all([
    loadPublishedRecords('national_park', ['national_parks', 'parks']),
    loadPublishedRecords('accommodations'),
  ]);
  const parkMeta = findRecordBySlug(parksLight, slug);
  const park =
    parkMeta?.id != null
      ? (await fetchCollectionRecordById('national_park', String(parkMeta.id), [
          'national_parks',
          'parks',
        ])) || parkMeta
      : parkMeta;
  const parkName = park ? getRecordTitle(park) : '';
  return {
    park: park && isPublishedRecord(park) ? park : null,
    others: parksLight.filter((row) => row !== parkMeta).slice(0, 20),
    stays: accommodations.filter((item) => {
      const name = pickStoredString(item, [
        'national_park_name',
        'national_park',
        'park',
        'park_name',
      ]);
      return Boolean(parkName && name && name.toLowerCase() === parkName.toLowerCase());
    }),
  };
}
