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
  resolvePublicTours,
  findRecordBySlug,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickStoredString,
  pickString,
  publicListColumnsFor,
  publicRecordSlug,
  TOUR_LIST_COLUMNS,
} from '@/lib/data-server';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { HOME_PAGE_SLUG, parseHomePageContent, type HomePageContent } from '@/lib/home-page-content';
import { mergePublicDestinations, type PublicDestination } from '@/lib/public-destinations';
import type { RecordRow } from '@/lib/types';

const STATIC_DETAIL_BUILD_LIMIT = 48;

function listColumns(table: string, aliases: string[] = []) {
  return publicListColumnsFor(table, aliases);
}

export async function loadPublishedRecords(
  table: string,
  aliases: string[] = [],
  options?: { columns?: string }
): Promise<RecordRow[]> {
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

function toClientProps<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => {
      if (typeof current === 'bigint') return current.toString();
      if (current instanceof Date) return current.toISOString();
      return current;
    })
  ) as T;
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
  const emptyPage = { rows: [] as RecordRow[], total: 0 };
  const [countries, tours, updatesPage, categories] = await Promise.all([
    withTimeout(
      fetchCollectionRecords('countries', [], {
        columns: listColumns('countries'),
        maxRows: 48,
      }).then((rows) => rows.filter(isPublishedRecord)),
      6000,
      [] as RecordRow[]
    ),
    withTimeout(fetchFeaturedTours(12), 12000, [] as RecordRow[]),
    withTimeout(
      fetchCollectionRecords('safari_updates', [], {
        columns: listColumns('safari_updates'),
        maxRows: 16,
      })
        .then((rows) => ({
          rows: rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row)),
          total: rows.length,
        }))
        .catch(() =>
          fetchCollectionPage('safari_updates', [], {
            columns: listColumns('safari_updates'),
            limit: 16,
            offset: 0,
          }).then((page) => ({
            rows: page.rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row)),
            total: page.total,
          }))
        ),
      12000,
      emptyPage
    ),
    withTimeout(
      fetchCollectionRecords('categories', [], {
        columns: listColumns('categories'),
        maxRows: 64,
      }).then((rows) => rows.filter(isPublishedRecord)),
      6000,
      [] as RecordRow[]
    ),
  ]);
  return toClientProps({
    countries,
    tours: tours.slice(0, 12),
    updates: updatesPage.rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row)).slice(0, 8),
    categories,
  });
}

export async function loadAccommodationsPageData(options?: { limit?: number; offset?: number }) {
  try {
    const page = await withTimeout(
      fetchCollectionPage('accommodations', [], {
        columns: listColumns('accommodations'),
        limit: options?.limit ?? 48,
        offset: options?.offset ?? 0,
      }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    );
    const rows = page.rows.filter(isPublishedRecord);
    return toClientProps({ rows, total: Math.max(page.total, rows.length) });
  } catch {
    return { rows: [] as RecordRow[], total: 0 };
  }
}

export async function loadToursPageData() {
  try {
    const [tourPage, categories, countries] = await Promise.all([
      withTimeout(
        fetchCollectionPage('tours', [], { columns: TOUR_LIST_COLUMNS, limit: 48, offset: 0 }),
        6000,
        { rows: [] as RecordRow[], total: 0 }
      ),
      withTimeout(
        fetchCollectionRecords('categories', [], { columns: listColumns('categories'), maxRows: 80 }),
        6000,
        [] as RecordRow[]
      ),
      withTimeout(
        fetchCollectionRecords('countries', [], { columns: listColumns('countries'), maxRows: 48 }),
        6000,
        [] as RecordRow[]
      ),
    ]);
    return toClientProps({
      tours: tourPage.rows.filter(isPublishedRecord),
      total: Math.max(tourPage.total, tourPage.rows.length),
      categories: categories.filter(isPublishedRecord),
      countries: countries.filter(isPublishedRecord),
    });
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
  const [countriesPage, categoriesPage] = await Promise.all([
    fetchCollectionPage('countries', [], { columns: listColumns('countries'), limit: 100, offset: 0 }).catch(() => ({
      rows: [] as RecordRow[],
      total: 0,
    })),
    fetchCollectionPage('categories', [], { columns: listColumns('categories'), limit: 100, offset: 0 }).catch(() => ({
      rows: [] as RecordRow[],
      total: 0,
    })),
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
  const countryId = country?.id != null ? String(country.id) : undefined;
  const [tours, parks, explorePage, accommodationsPage] = await Promise.all([
    resolvePublicTours({ country: countryName, limit: 48 }).catch(() => [] as RecordRow[]),
    withTimeout(fetchParksForCountry(countryName, 24, countryId), 8000, [] as RecordRow[]),
    withTimeout(
      fetchCollectionPage('explore', [], {
        columns: listColumns('explore'),
        limit: 80,
        offset: 0,
      }),
      8000,
      { rows: [] as RecordRow[], total: 0 }
    ),
    withTimeout(
      fetchCollectionPage('accommodations', [], {
        columns: listColumns('accommodations'),
        limit: 80,
        offset: 0,
      }),
      8000,
      { rows: [] as RecordRow[], total: 0 }
    ),
  ]);
  const matchedTours = tours.filter((row) => matchesCountry(row, slug));
  const places = explorePage.rows
    .filter(isPublishedRecord)
    .filter((row) => matchesCountry(row, slug) || recordMatchesCountrySlug(row, slug));
  const stays = accommodationsPage.rows
    .filter(isPublishedRecord)
    .filter((row) => matchesCountry(row, slug) || recordMatchesCountrySlug(row, slug));
  return {
    country: country && isPublishedRecord(country) ? country : null,
    categories: categories.filter((row) => categoryMatchesCountry(row, slug)),
    tours: matchedTours.length ? matchedTours : tours,
    parks: parks.filter(isPublishedRecord),
    places,
    stays,
  };
}

export async function loadTourDetail(slug: string) {
  const tour = await withTimeout(fetchRecordByPublicSlug('tours', slug), 12000, null);
  if (tour && !isPublishedRecord(tour)) {
    return { tour: null, related: [] as RecordRow[] };
  }
  const country = tour ? pickString(tour, ['country']) : '';
  const category = tour ? pickString(tour, ['category']) : '';
  const relatedPool = await withTimeout(
    resolvePublicTours({ country, limit: 40, excludeId: tour?.id != null ? String(tour.id) : undefined }),
    8000,
    [] as RecordRow[]
  );
  const sameCountry = relatedPool.filter((row) => String(row.id) !== String(tour?.id || ''));
  const sameCategory = category ? sameCountry.filter((row) => matchesCategoryValue(row, category)) : [];
  return toClientProps({
    tour,
    related: (sameCategory.length ? sameCategory : sameCountry).slice(0, 12),
  });
}

export async function loadParksPageData(options?: { limit?: number; offset?: number }) {
  try {
    const page = await withTimeout(
      fetchCollectionPage('national_park', ['national_parks', 'parks'], {
        columns: listColumns('national_park', ['national_parks', 'parks']),
        limit: options?.limit ?? 48,
        offset: options?.offset ?? 0,
      }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    );
    const parks = page.rows.filter(isPublishedRecord);
    return toClientProps({ parks, total: Math.max(page.total, parks.length) });
  } catch {
    return { parks: [] as RecordRow[], total: 0 };
  }
}

export async function loadSafariUpdatesPageData(options?: { limit?: number; offset?: number }) {
  try {
    const page = await withTimeout(
      fetchCollectionPage('safari_updates', [], {
        columns: listColumns('safari_updates'),
        limit: options?.limit ?? 48,
        offset: options?.offset ?? 0,
      }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    );
    const posts = page.rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row));
    return toClientProps({ posts, total: Math.max(page.total, posts.length) });
  } catch {
    return { posts: [] as RecordRow[], total: 0 };
  }
}

export async function loadExplorePageData(options?: { limit?: number; offset?: number }) {
  try {
    const page = await withTimeout(
      fetchCollectionPage('explore', [], {
        columns: listColumns('explore'),
        limit: options?.limit ?? 48,
        offset: options?.offset ?? 0,
      }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    );
    const places = page.rows.filter(isPublishedRecord);
    return toClientProps({ places, total: Math.max(page.total, places.length) });
  } catch {
    return { places: [] as RecordRow[], total: 0 };
  }
}

export async function loadParkDetail(slug: string) {
  const [park, parkPage] = await Promise.all([
    withTimeout(fetchRecordByPublicSlug('national_park', slug, ['national_parks', 'parks']), 12000, null),
    withTimeout(
      fetchCollectionPage('national_park', ['national_parks', 'parks'], { limit: 20, offset: 0 }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    ),
  ]);
  const published = park && isPublishedRecord(park) ? park : null;
  const parkName = published ? getRecordTitle(published) : '';
  const stays = parkName
    ? await withTimeout(
        fetchStaysForPark(parkName, 10, published?.id != null ? String(published.id) : undefined),
        4000,
        [] as RecordRow[]
      )
    : [];
  const others = published
    ? parkPage.rows
        .filter(isPublishedRecord)
        .filter((row) => String(row.id) !== String(published.id || ''))
        .slice(0, 20)
    : [];
  return toClientProps({ park: published, others, stays: published ? stays : [] });
}

export async function loadSafariUpdateDetail(slug: string) {
  const [post, updatePage] = await Promise.all([
    withTimeout(fetchRecordByPublicSlug('safari_updates', slug), 12000, null),
    withTimeout(
      fetchCollectionPage('safari_updates', [], { limit: 20, offset: 0 }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    ),
  ]);
  const published = post && isPublishedRecord(post) ? post : null;
  const related = published
    ? updatePage.rows
        .filter(isPublishedRecord)
        .filter((row) => String(row.id) !== String(published.id || '') && !isLanguagePost(row))
        .slice(0, 20)
    : [];
  const country = published ? pickStoredString(published, ['country', 'category']) : '';
  const tours = published
    ? await withTimeout(
        resolvePublicTours({
          country,
          limit: 12,
          excludeId: published.id != null ? String(published.id) : undefined,
        }),
        8000,
        [] as RecordRow[]
      )
    : [];
  return toClientProps({
    post: published,
    related,
    tours: tours.slice(0, 12),
  });
}

export async function loadAccommodationDetail(slug: string) {
  const [item, stayPage] = await Promise.all([
    withTimeout(fetchRecordByPublicSlug('accommodations', slug), 12000, null),
    withTimeout(
      fetchCollectionPage('accommodations', [], { limit: 20, offset: 0 }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    ),
  ]);
  const published = item && isPublishedRecord(item) ? item : null;
  const others = published
    ? stayPage.rows
        .filter(isPublishedRecord)
        .filter((row) => String(row.id) !== String(published.id || ''))
        .slice(0, 20)
    : [];
  const country = published ? pickStoredString(published, ['country']) : '';
  const tours = published
    ? await withTimeout(
        resolvePublicTours({
          country,
          limit: 12,
          excludeId: published.id != null ? String(published.id) : undefined,
        }),
        8000,
        [] as RecordRow[]
      )
    : [];
  return toClientProps({
    item: published,
    others,
    tours: tours.slice(0, 12),
  });
}

export async function loadExploreDetail(slug: string) {
  const [place, placePage] = await Promise.all([
    withTimeout(fetchRecordByPublicSlug('explore', slug), 12000, null),
    withTimeout(
      fetchCollectionPage('explore', [], { limit: 24, offset: 0 }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    ),
  ]);
  const published = place && isPublishedRecord(place) ? place : null;
  const countryKey = published
    ? pickStoredString(published, ['country', 'country_slug', 'destination', 'nation'])
    : '';
  const otherPlaces = published
    ? placePage.rows
        .filter(isPublishedRecord)
        .filter((row) => String(row.id) !== String(published.id || ''))
    : [];
  const countryPlaces = countryKey
    ? otherPlaces.filter((row) => matchesCountry(row, countryKey) || recordMatchesCountrySlug(row, countryKey))
    : [];
  const tours = published
    ? await withTimeout(
        resolvePublicTours({
          country: countryKey,
          limit: 12,
          excludeId: published.id != null ? String(published.id) : undefined,
        }),
        8000,
        [] as RecordRow[]
      )
    : [];
  return toClientProps({
    place: published,
    others: (countryPlaces.length ? countryPlaces : otherPlaces).slice(0, 20),
    tours: tours.slice(0, 12),
  });
}

/** Slugs to pre-render at build time (ISR + CDN). */
export async function loadStaticTourParams(): Promise<{ slug: string }[]> {
  try {
    const featured = await fetchFeaturedTours(STATIC_DETAIL_BUILD_LIMIT);
    const fromFeatured = featured
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug));
    if (fromFeatured.length) {
      return fromFeatured.map((slug) => ({ slug }));
    }
    const rows = await loadPublishedRecords('tours', [], {
      columns: 'id,slug,seo_slug,title,published',
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .slice(0, STATIC_DETAIL_BUILD_LIMIT)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export function loadStaticDestinationParams(): { slug: string }[] {
  const slugs = new Set<string>();
  for (const item of [...NAV_COUNTRIES, ...OTHER_DESTINATIONS]) {
    if (item.slug) slugs.add(item.slug);
  }
  return [...slugs].map((slug) => ({ slug }));
}

export async function loadStaticAccommodationParams(): Promise<{ slug: string }[]> {
  try {
    const rows = await loadPublishedRecords('accommodations', [], {
      columns: 'id,slug,seo_slug,title,published',
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .slice(0, STATIC_DETAIL_BUILD_LIMIT)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loadStaticParkParams(): Promise<{ slug: string }[]> {
  try {
    const rows = await loadPublishedRecords('national_park', ['national_parks', 'parks'], {
      columns: 'id,slug,seo_slug,title,published',
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .slice(0, STATIC_DETAIL_BUILD_LIMIT)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loadStaticExploreParams(): Promise<{ slug: string }[]> {
  try {
    const rows = await loadPublishedRecords('explore', [], {
      columns: 'id,slug,seo_slug,title,published',
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .slice(0, STATIC_DETAIL_BUILD_LIMIT)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loadStaticSafariUpdateParams(): Promise<{ slug: string }[]> {
  try {
    const page = await fetchCollectionPage('safari_updates', [], {
      limit: STATIC_DETAIL_BUILD_LIMIT,
      offset: 0,
    });
    return page.rows
      .filter(isPublishedRecord)
      .filter((row) => !isLanguagePost(row))
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

/** Header/footer destination chips — loaded once per cached PublicShell render. */
export async function loadPublicNavDestinations(): Promise<PublicDestination[]> {
  try {
    const rows = await withTimeout(
      fetchCollectionRecords('countries', [], {
        columns: listColumns('countries'),
        maxRows: 48,
      }).then((data) => data.filter(isPublishedRecord)),
      5000,
      [] as RecordRow[]
    );
    return mergePublicDestinations(rows);
  } catch {
    return mergePublicDestinations([]);
  }
}
