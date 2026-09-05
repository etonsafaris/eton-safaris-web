import { unstable_noStore as noStore } from 'next/cache';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
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
  fetchParksForCountry,
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
} from '@/lib/data-server';
import { HOME_PAGE_SLUG, parseHomePageContent, type HomePageContent } from '@/lib/home-page-content';
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
    let match = matchCmsRecord(rows, slug, pageAliases(slug));

    if (!match && (slug === 'terms-of-services' || slug === 'privacy-policies')) {
      const needle = slug.includes('terms') ? 'terms' : 'privacy';
      match =
        rows.find((row) => {
          const title = pickString(row, ['title', 'name', 'post_title']).toLowerCase();
          const rowSlug = normalizeSlug(pickString(row, ['slug', 'seo_slug']));
          return title.includes(needle) || rowSlug.includes(needle);
        }) || null;
    }

    if (!match || !isPublishedRecord(match)) return null;
    const id = String(match.id || '');
    if (!id) return null;
    const full = await fetchCollectionRecordById('pages', id);
    if (full && isPublishedRecord(full)) return full;
    return null;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

export async function loadHomePageContent(): Promise<HomePageContent | null> {
  noStore();
  try {
    const columns = listColumns('pages');
    const rows = await fetchCollectionRecords('pages', [], columns ? { columns } : undefined);
    const match =
      matchCmsRecord(rows, HOME_PAGE_SLUG, pageAliases(HOME_PAGE_SLUG).concat(['home', 'homepage'])) ||
      rows.find((row) => String(row.layout || '').toLowerCase() === 'home') ||
      null;
    if (!match || !isPublishedRecord(match)) return null;
    const id = String(match.id || '');
    const full = id ? await fetchCollectionRecordById('pages', id) : match;
    return parseHomePageContent(full || match);
  } catch {
    return null;
  }
}

export async function loadHomePageData() {
  noStore();
  const emptyPage = { rows: [] as RecordRow[], total: 0 };
  const [parkPage, countries, tours, updatesPage, categories] = await Promise.all([
    withTimeout(
      fetchCollectionPage('national_park', ['national_parks', 'parks'], {
        columns: listColumns('national_park', ['national_parks', 'parks']),
        limit: 12,
        offset: 0,
      }),
      5000,
      emptyPage
    ),
    withTimeout(
      fetchCollectionRecords('countries', [], {
        columns: listColumns('countries'),
        maxRows: 48,
      }).then((rows) => rows.filter(isPublishedRecord)),
      5000,
      [] as RecordRow[]
    ),
    withTimeout(fetchFeaturedTours(12), 5000, [] as RecordRow[]),
    withTimeout(
      fetchCollectionPage('safari_updates', [], {
        columns: listColumns('safari_updates'),
        limit: 8,
        offset: 0,
      }),
      5000,
      emptyPage
    ),
    withTimeout(
      fetchCollectionRecords('categories', [], {
        columns: listColumns('categories'),
        maxRows: 64,
      }).then((rows) => rows.filter(isPublishedRecord)),
      5000,
      [] as RecordRow[]
    ),
  ]);
  return {
    countries,
    tours: tours.slice(0, 12),
    updates: updatesPage.rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row)).slice(0, 8),
    parks: parkPage.rows.filter(isPublishedRecord).slice(0, 12),
    categories,
  };
}

export async function loadAccommodationsPageData() {
  noStore();
  try {
    const page = await withTimeout(
      fetchCollectionPage('accommodations', [], {
        columns: listColumns('accommodations'),
        limit: 48,
        offset: 0,
      }),
      4500,
      { rows: [] as RecordRow[], total: 0 }
    );
    const rows = page.rows.filter(isPublishedRecord);
    return { rows, total: Math.max(page.total, rows.length) };
  } catch {
    return { rows: [] as RecordRow[], total: 0 };
  }
}

export async function loadToursPageData() {
  noStore();
  try {
    const [tourPage, categories, countries] = await Promise.all([
      withTimeout(
        fetchCollectionPage('tours', [], { columns: TOUR_LIST_COLUMNS, limit: 48, offset: 0 }),
        4500,
        { rows: [] as RecordRow[], total: 0 }
      ),
      withTimeout(
        fetchCollectionRecords('categories', [], { columns: listColumns('categories'), maxRows: 80 }),
        4500,
        [] as RecordRow[]
      ),
      withTimeout(
        fetchCollectionRecords('countries', [], { columns: listColumns('countries'), maxRows: 48 }),
        4500,
        [] as RecordRow[]
      ),
    ]);
    return {
      tours: tourPage.rows.filter(isPublishedRecord),
      total: Math.max(tourPage.total, tourPage.rows.length),
      categories: categories.filter(isPublishedRecord),
      countries: countries.filter(isPublishedRecord),
    };
  } catch {
    return {
      tours: [] as RecordRow[],
      total: 0,
      categories: [] as RecordRow[],
      countries: [] as RecordRow[],
    };
  }
}

export async function loadCountryPageData(slug: string) {
  noStore();
  const [countriesPage, categoriesPage, placesPage] = await Promise.all([
    fetchCollectionPage('countries', [], { columns: listColumns('countries'), limit: 100, offset: 0 }).catch(() => ({
      rows: [] as RecordRow[],
      total: 0,
    })),
    fetchCollectionPage('categories', [], { columns: listColumns('categories'), limit: 100, offset: 0 }).catch(() => ({
      rows: [] as RecordRow[],
      total: 0,
    })),
    fetchCollectionPage('explore', [], {
      columns: listColumns('explore'),
      limit: 48,
      offset: 0,
      filters: { country: slug },
    }).catch(() => ({ rows: [] as RecordRow[], total: 0 })),
  ]);
  const countries = countriesPage.rows.filter(isPublishedRecord);
  const categories = categoriesPage.rows.filter(isPublishedRecord);
  const countryMeta =
    findCountryRecord(countries, slug) ||
    (await fetchRecordByPublicSlug('countries', slug).catch(() => null));
  const country =
    countryMeta?.id != null
      ? (await fetchCollectionRecordById('countries', String(countryMeta.id)).catch(() => null)) || countryMeta
      : countryMeta;
  const countryName =
    (country ? publicCountryLabel(country, slug) : '') ||
    pickString(country || {}, ['name', 'title']) ||
    slug;
  const [tours, parks] = await Promise.all([
    fetchToursForCountryLabel(countryName, 48).catch(() => [] as RecordRow[]),
    fetchParksForCountry(countryName, 48, country?.id != null ? String(country.id) : undefined).catch(() => [] as RecordRow[]),
  ]);
  return {
    country: country && isPublishedRecord(country) ? country : null,
    categories: categories.filter((row) => categoryMatchesCountry(row, slug)),
    tours: tours.filter((row) => matchesCountry(row, slug)),
    parks: parks.filter(isPublishedRecord),
    places: placesPage.rows.filter(isPublishedRecord).filter((row) => matchesCountry(row, slug)),
  };
}

export async function loadTourDetail(slug: string) {
  noStore();
  const tour = await withTimeout(fetchRecordByPublicSlug('tours', slug), 4500, null);
  if (tour && !isPublishedRecord(tour)) {
    return { tour: null, related: [] as RecordRow[] };
  }
  const country = tour ? pickString(tour, ['country']) : '';
  const category = tour ? pickString(tour, ['category']) : '';
  const relatedPool = country
    ? await withTimeout(fetchToursForCountryLabel(country, 40), 1200, [] as RecordRow[])
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
    withTimeout(fetchRecordByPublicSlug('national_park', slug, ['national_parks', 'parks']), 4500, null),
    withTimeout(
      fetchCollectionPage('national_park', ['national_parks', 'parks'], { limit: 20, offset: 0 }),
      4500,
      { rows: [] as RecordRow[], total: 0 }
    ),
  ]);
  const parkName = park ? getRecordTitle(park) : '';
  const stays = parkName
    ? await withTimeout(
        fetchStaysForPark(parkName, 10, park?.id != null ? String(park.id) : undefined),
        1200,
        [] as RecordRow[]
      )
    : [];
  return {
    park: park && isPublishedRecord(park) ? park : null,
    others: parkPage.rows.filter((row) => String(row.id) !== String(park?.id || '')).slice(0, 20),
    stays,
  };
}
