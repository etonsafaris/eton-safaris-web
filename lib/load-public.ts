import { CMS_PUBLIC_CACHE_TAG, CMS_PUBLIC_REVALIDATE_SECONDS } from '@/lib/cms-public-cache';
import { countrySlugFromLanding, landingSlugForCountry, matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { unstable_cache } from 'next/cache';
import {
  categoryMatchesCountry,
  categoryPublicSlug,
  canonicalCountrySlug,
  countryLabelFromSlug,
  filterToursByCategory,
  findCategoryBySlug,
  matchesCategoryValue,
  matchesCountry,
  publicCountryLabel,
  recordCountryValues,
  recordMatchesCountrySlug,
} from '@/lib/country-utils';
import {
  fetchCollectionRecordById,
  fetchCollectionRecords,
  fetchCollectionPage,
  fetchPublicSafariUpdatesPage,
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
import { skipParkStaysDuringBuild, skipStaticGenerationDuringBuild } from '@/lib/build-phase';
import {
  EMPTY_COUNTRY_PAGE_DATA,
  isCountryPageDataSparse,
  withCountryPageFallback,
  type CountryPageData,
} from '@/lib/country-page-fallback';
import { resolveSafariUpdatePost } from '@/lib/safari-update-load';
import { EMPTY_SAFARI_UPDATE_DETAIL } from '@/lib/safe-public-load';
import type { RecordRow } from '@/lib/types';

const STATIC_DETAIL_BUILD_LIMIT = 24;

const FAKE_STAY_SLUG_RE =
  /-(river|savannah|forest|hilltop|horizon|baobab|mist|sunset|valley|lagoon|canyon|plateau|oasis|crest|trail)-(luxury|safari)-(lodge|camp|hotel|bandas)(-|$)/i;

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

/** Shared Next.js data cache for public CMS reads (15 min, bust via cms-public tag). */
function cachedPublic<T>(keyParts: string[], tags: string[], loader: () => Promise<T>): Promise<T> {
  return unstable_cache(loader, keyParts, {
    revalidate: CMS_PUBLIC_REVALIDATE_SECONDS,
    tags: [CMS_PUBLIC_CACHE_TAG, ...tags],
  })();
}

/** Two attempts — avoids false "missing" when Aiven is cold or the first query times out. */
async function fetchPublicRecordResilient(
  table: string,
  slug: string,
  aliases: string[] = []
): Promise<RecordRow | null> {
  const first = await withTimeout(fetchRecordByPublicSlug(table, slug, aliases), 8000, null);
  if (first) return first;
  return await withTimeout(fetchRecordByPublicSlug(table, slug, aliases), 10000, null);
}

export async function loadHomePageContent(): Promise<HomePageContent | null> {
  try {
    const row = await withTimeout(
      fetchRecordByPublicSlug('pages', HOME_PAGE_SLUG, pageAliases(HOME_PAGE_SLUG)),
      5000,
      null
    );
    if (row && isPublishedRecord(row)) {
      return parseHomePageContent(row);
    }

    const page = await withTimeout(
      fetchCollectionPage('pages', [], {
        columns: listColumns('pages'),
        limit: 4,
        offset: 0,
      }),
      5000,
      { rows: [] as RecordRow[], total: 0 }
    );
    const match =
      page.rows.find((row) => String(row.layout || '').toLowerCase() === 'home') ||
      page.rows.find((row) => isPublishedRecord(row)) ||
      null;
    if (!match || !isPublishedRecord(match)) return null;
    return parseHomePageContent(match);
  } catch {
    return null;
  }
}

async function loadHomePageCountriesSlice() {
  const rows = await withTimeout(
    fetchCollectionRecords('countries', [], {
      columns: listColumns('countries'),
      maxRows: 48,
    }).then((data) => data.filter(isPublishedRecord)),
    6000,
    [] as RecordRow[]
  );
  return rows;
}

async function loadHomePageCategoriesSlice() {
  return await withTimeout(
    fetchCollectionRecords('categories', [], {
      columns: listColumns('categories'),
      maxRows: 64,
    }).then((rows) => rows.filter(isPublishedRecord)),
    6000,
    [] as RecordRow[]
  );
}

async function loadHomePageToursSlice() {
  let tours = await withTimeout(fetchFeaturedTours(12), 6000, [] as RecordRow[]);
  if (!tours.length) {
    tours = await withTimeout(fetchFeaturedTours(12), 10000, [] as RecordRow[]);
  }
  if (!tours.length) {
    try {
      const listing = await loadToursPageData();
      tours = listing.tours.slice(0, 12);
    } catch {
      tours = [];
    }
  }
  return tours.slice(0, 12);
}

async function loadHomePageUpdatesSlice() {
  const emptyPage = { rows: [] as RecordRow[], total: 0 };
  let page = await withTimeout(
    fetchPublicSafariUpdatesPage({ limit: 16, offset: 0 }).then((result) => ({
      rows: result.rows,
      total: result.total,
    })),
    6000,
    emptyPage
  );
  if (!page.rows.length) {
    page = await withTimeout(
      fetchPublicSafariUpdatesPage({ limit: 16, offset: 0 }).then((result) => ({
        rows: result.rows,
        total: result.total,
      })),
      10000,
      emptyPage
    );
  }
  if (!page.rows.length) {
    try {
      const listing = await loadSafariUpdatesPageData({ limit: 8, offset: 0 });
      page = { rows: listing.posts, total: listing.total };
    } catch {
      page = emptyPage;
    }
  }
  return page.rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row)).slice(0, 8);
}

export async function loadHomePageData() {
  try {
    const [countries, tours, updates, categories] = await Promise.all([
      loadHomePageCountriesSlice(),
      loadHomePageToursSlice(),
      loadHomePageUpdatesSlice(),
      loadHomePageCategoriesSlice(),
    ]);
    return toClientProps({
      countries,
      tours,
      updates,
      categories,
    });
  } catch (error) {
    console.warn('[Public] loadHomePageData failed:', error);
    return toClientProps({
      countries: [] as RecordRow[],
      tours: [] as RecordRow[],
      updates: [] as RecordRow[],
      categories: [] as RecordRow[],
    });
  }
}

async function loadHomePageContentCached() {
  return cachedPublic(['home-page-content-v1'], ['collection:pages'], () => loadHomePageContent());
}

async function loadHomePageBundleLive() {
  const [data, content] = await Promise.all([loadHomePageData(), loadHomePageContentCached()]);
  const destinations = mergePublicDestinations(data.countries ?? []);
  return { data, content, destinations };
}

/** One homepage pass: cached 15 min so origin does not hit Aiven on every visitor. */
export async function loadHomePageBundle() {
  return unstable_cache(loadHomePageBundleLive, ['home-page-bundle-v3'], {
    revalidate: CMS_PUBLIC_REVALIDATE_SECONDS,
    tags: [CMS_PUBLIC_CACHE_TAG, 'home-page'],
  })();
}

const HOME_BUNDLE_WAIT_MS = 10000;

/** Never throws — used by `/` and `/api/public/home-bundle` so a slow DB cannot blank the home page. */
export async function loadHomePageBundleResilient() {
  try {
    const bundle = await Promise.race([
      loadHomePageBundle(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), HOME_BUNDLE_WAIT_MS)),
    ]);
    if (bundle) return bundle;
    console.warn('[Public] Home bundle wait exceeded — serving fallbacks');
    return { data: await loadHomePageData(), content: null, destinations: [] as PublicDestination[] };
  } catch (error) {
    console.error('[Public] Home bundle failed:', error);
    return { data: await loadHomePageData().catch(() => ({
      countries: [] as RecordRow[],
      tours: [] as RecordRow[],
      updates: [] as RecordRow[],
      categories: [] as RecordRow[],
    })), content: null, destinations: [] as PublicDestination[] };
  }
}

async function loadAccommodationsPageDataLive(limit: number, offset: number) {
  try {
    const page = await withTimeout(
      fetchCollectionPage('accommodations', [], {
        columns: listColumns('accommodations'),
        limit,
        offset,
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

export async function loadAccommodationsPageData(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 48;
  const offset = options?.offset ?? 0;
  return cachedPublic(
    ['accommodations-page-v1', String(limit), String(offset)],
    ['collection:accommodations'],
    () => loadAccommodationsPageDataLive(limit, offset)
  );
}

async function loadToursPageDataLive() {
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

export async function loadToursPageData() {
  return cachedPublic(['tours-page-data-v1'], ['collection:tours'], loadToursPageDataLive);
}

export async function loadDestinationsIndexCountries() {
  return cachedPublic(['destinations-index-countries-v1'], ['collection:countries'], () =>
    loadPublishedRecords('countries')
  );
}

export async function loadCountryPageData(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    const cached = await cachedPublic(
      ['country-page-data-v3', normalized],
      ['collection:countries', `country:${normalized}`],
      () => loadCountryPageDataInner(normalized)
    );
    if (!isCountryPageDataSparse(cached)) return cached;
    const retry = await loadCountryPageDataInner(normalized);
    return isCountryPageDataSparse(retry) ? cached : retry;
  } catch (error) {
    console.warn('[Public] loadCountryPageData failed:', slug, error);
    return withCountryPageFallback(EMPTY_COUNTRY_PAGE_DATA, normalized);
  }
}

const COUNTRY_PAGE_WAIT_MS = 12000;

/** Never throws — used by destination routes and recovery API. */
export async function loadCountryPageDataResilient(slug: string): Promise<CountryPageData> {
  const normalized = normalizeSlug(slug);
  try {
    const raced = await Promise.race([
      loadCountryPageData(normalized),
      new Promise<CountryPageData | null>((resolve) =>
        setTimeout(() => resolve(null), COUNTRY_PAGE_WAIT_MS)
      ),
    ]);
    let data = raced || EMPTY_COUNTRY_PAGE_DATA;
    if (isCountryPageDataSparse(data)) {
      const retry = await loadCountryPageDataInner(normalized).catch(() => EMPTY_COUNTRY_PAGE_DATA);
      if (!isCountryPageDataSparse(retry)) data = retry;
    }
    if (!data.tours.length) {
      const label =
        publicCountryLabel(data.country, normalized) || countryLabelFromSlug(normalized) || normalized;
      const tours = await withTimeout(
        resolvePublicTours({ country: label, limit: 48 }),
        8000,
        [] as RecordRow[]
      ).catch(() => [] as RecordRow[]);
      if (tours.length) {
        const matched = tours.filter((row) => matchesCountry(row, normalized));
        data = { ...data, tours: matched.length ? matched : tours };
      }
    }
    return withCountryPageFallback(data, normalized);
  } catch (error) {
    console.warn('[Public] loadCountryPageDataResilient failed:', normalized, error);
    return withCountryPageFallback(EMPTY_COUNTRY_PAGE_DATA, normalized);
  }
}

async function loadCountryPageDataInner(slug: string) {
  const [countryMeta, categoriesRaw] = await Promise.all([
    withTimeout(fetchRecordByPublicSlug('countries', slug), 6000, null),
    withTimeout(
      fetchCollectionRecords('categories', [], {
        columns: listColumns('categories'),
        maxRows: 80,
      })
        .then((rows) => rows.filter(isPublishedRecord))
        .catch(() => [] as RecordRow[]),
      6000,
      [] as RecordRow[]
    ),
  ]);
  let country: RecordRow | null = countryMeta;
  if (countryMeta?.id != null) {
    country = await withTimeout(
      fetchCollectionRecordById('countries', String(countryMeta.id)),
      6000,
      countryMeta
    );
  }
  const categories = categoriesRaw.filter((row) => categoryMatchesCountry(row, slug));
  const countryName =
    (country ? publicCountryLabel(country, slug) : '') ||
    pickString(country || {}, ['name', 'title']) ||
    slug;
  const countryId = country?.id != null ? String(country.id) : undefined;
  const [tours, parks, explorePage] = await Promise.all([
    withTimeout(resolvePublicTours({ country: countryName, limit: 48 }), 6000, [] as RecordRow[]).catch(
      () => [] as RecordRow[]
    ),
    withTimeout(fetchParksForCountry(countryName, 20, countryId), 6000, [] as RecordRow[]),
    withTimeout(
      fetchCollectionPage('explore', [], {
        columns: listColumns('explore'),
        limit: 32,
        offset: 0,
      }),
      5000,
      { rows: [] as RecordRow[], total: 0 }
    ),
  ]);
  const matchedTours = tours.filter((row) => matchesCountry(row, slug));
  const places = explorePage.rows
    .filter(isPublishedRecord)
    .filter((row) => matchesCountry(row, slug) || recordMatchesCountrySlug(row, slug));
  const fallbackCountry: RecordRow = {
    name: countryName,
    title: countryName,
    slug,
  };
  return {
    country:
      country && isPublishedRecord(country)
        ? country
        : countryName
          ? fallbackCountry
          : null,
    categories,
    tours: matchedTours.length ? matchedTours : tours,
    parks: parks.filter(isPublishedRecord),
    places,
  };
}

async function loadTourDetailLive(slug: string) {
  try {
    const tour = await fetchPublicRecordResilient('tours', slug);
    if (tour && !isPublishedRecord(tour)) {
      return { tour: null, related: [] as RecordRow[] };
    }
    const country = tour ? pickString(tour, ['country']) : '';
    const category = tour ? pickString(tour, ['category']) : '';
    const relatedPool = await withTimeout(
      resolvePublicTours({ country, limit: 40, excludeId: tour?.id != null ? String(tour.id) : undefined }),
      6000,
      [] as RecordRow[]
    );
    const sameCountry = (relatedPool ?? []).filter((row) => row && String(row.id) !== String(tour?.id || ''));
    const sameCategory = category ? sameCountry.filter((row) => matchesCategoryValue(row, category)) : [];
    return toClientProps({
      tour,
      related: (sameCategory.length ? sameCategory : sameCountry).slice(0, 12),
    });
  } catch (error) {
    console.warn('[Public] loadTourDetail failed:', slug, error);
    return { tour: null, related: [] as RecordRow[] };
  }
}

export async function loadTourDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  return cachedPublic(['tour-detail-v1', normalized], ['collection:tours', `tour:${normalized}`], () =>
    loadTourDetailLive(normalized)
  );
}

async function loadParksPageDataLive(limit: number, offset: number) {
  try {
    const page = await withTimeout(
      fetchCollectionPage('national_park', ['national_parks', 'parks'], {
        columns: listColumns('national_park', ['national_parks', 'parks']),
        limit,
        offset,
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

export async function loadParksPageData(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 48;
  const offset = options?.offset ?? 0;
  return cachedPublic(
    ['parks-page-data-v1', String(limit), String(offset)],
    ['collection:national_park'],
    () => loadParksPageDataLive(limit, offset)
  );
}

async function loadSafariUpdatesPageDataLive(limit: number, offset: number) {
  try {
    const page = await withTimeout(
      fetchPublicSafariUpdatesPage({ limit, offset }),
      6000,
      { rows: [] as RecordRow[], total: 0 }
    );
    return toClientProps({ posts: page.rows, total: page.total });
  } catch (error) {
    console.warn('[Public] Safari updates listing failed:', error);
    return { posts: [] as RecordRow[], total: 0 };
  }
}

export async function loadSafariUpdatesPageData(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 48;
  const offset = options?.offset ?? 0;
  return cachedPublic(
    ['safari-updates-page-v1', String(limit), String(offset)],
    ['collection:safari_updates'],
    () => loadSafariUpdatesPageDataLive(limit, offset)
  );
}

async function loadExplorePageDataLive(limit: number, offset: number) {
  try {
    const page = await withTimeout(
      fetchCollectionPage('explore', [], {
        columns: listColumns('explore'),
        limit,
        offset,
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

export async function loadExplorePageData(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 48;
  const offset = options?.offset ?? 0;
  return cachedPublic(
    ['explore-page-data-v1', String(limit), String(offset)],
    ['collection:explore'],
    () => loadExplorePageDataLive(limit, offset)
  );
}

async function loadParkDetailLive(slug: string) {
  try {
    const [park, parkPage] = await Promise.all([
      fetchPublicRecordResilient('national_park', slug, ['national_parks', 'parks']),
      withTimeout(
        fetchCollectionPage('national_park', ['national_parks', 'parks'], { limit: 20, offset: 0 }),
        6000,
        { rows: [] as RecordRow[], total: 0 }
      ),
    ]);
    const published = park && isPublishedRecord(park) ? park : null;
    const parkName = published ? getRecordTitle(published) : '';
    const stays =
      parkName && !skipParkStaysDuringBuild()
        ? await withTimeout(
            fetchStaysForPark(parkName, 10, published?.id != null ? String(published.id) : undefined),
            4000,
            [] as RecordRow[]
          )
        : [];
    const rows = parkPage?.rows ?? [];
    const others = published
      ? rows
          .filter(isPublishedRecord)
          .filter((row) => String(row?.id) !== String(published.id || ''))
          .slice(0, 20)
      : [];
    return toClientProps({ park: published, others, stays: published ? stays ?? [] : [] });
  } catch (error) {
    console.warn('[Public] loadParkDetail failed:', slug, error);
    return { park: null, others: [] as RecordRow[], stays: [] as RecordRow[] };
  }
}

export async function loadParkDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  return cachedPublic(
    ['park-detail-v1', normalized],
    ['collection:national_park', `park:${normalized}`],
    () => loadParkDetailLive(normalized)
  );
}

async function loadSafariUpdateDetailLive(slug: string) {
  try {
    const [resolved, updatePage] = await Promise.all([
      withTimeout(resolveSafariUpdatePost(slug), 12000, null),
      withTimeout(
        fetchPublicSafariUpdatesPage({ limit: 20, offset: 0 }),
        6000,
        { rows: [] as RecordRow[], total: 0 }
      ),
    ]);
    const published =
      resolved && isPublishedRecord(resolved) && !isLanguagePost(resolved) ? resolved : null;
    const related = published
      ? (updatePage?.rows ?? [])
          .filter((row) => String(row?.id) !== String(published.id || ''))
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
          6000,
          [] as RecordRow[]
        )
      : [];
    return toClientProps({
      post: published,
      related,
      tours: (tours ?? []).slice(0, 12),
    });
  } catch (error) {
    console.warn('[Public] loadSafariUpdateDetail failed:', slug, error);
    return { post: null, related: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

export async function loadSafariUpdateDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  const cached = await cachedPublic(
    ['safari-update-detail-v2', normalized],
    ['collection:safari_updates', `safari_update:${normalized}`],
    () => loadSafariUpdateDetailLive(normalized)
  );
  if (cached.post) return cached;
  const retry = await loadSafariUpdateDetailLive(normalized);
  return retry.post ? retry : cached;
}

const SAFARI_DETAIL_WAIT_MS = 12000;

/** Used by the detail page and recovery API — does not throw on slow DB. */
export async function loadSafariUpdateDetailResilient(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    const detail = await Promise.race([
      loadSafariUpdateDetail(normalized),
      new Promise<typeof EMPTY_SAFARI_UPDATE_DETAIL>((resolve) =>
        setTimeout(() => resolve(EMPTY_SAFARI_UPDATE_DETAIL), SAFARI_DETAIL_WAIT_MS)
      ),
    ]);
    if (detail.post) return detail;
    const post = await withTimeout(resolveSafariUpdatePost(normalized), 10000, null);
    if (!post) return detail;
    return {
      post,
      related: detail.related ?? [],
      tours: detail.tours ?? [],
    };
  } catch (error) {
    console.warn('[Public] loadSafariUpdateDetailResilient failed:', normalized, error);
    return EMPTY_SAFARI_UPDATE_DETAIL;
  }
}

export async function loadSafariUpdatesListingResilient(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 48;
  const offset = options?.offset ?? 0;
  try {
    let loaded = await loadSafariUpdatesPageData({ limit, offset });
    if (loaded.posts.length) return loaded;
    loaded = await loadSafariUpdatesPageDataLive(limit, offset);
    return loaded;
  } catch (error) {
    console.warn('[Public] Safari updates listing resilient load failed:', error);
    return { posts: [] as RecordRow[], total: 0 };
  }
}

export async function loadAccommodationDetail(slug: string) {
  try {
    const [item, stayPage] = await Promise.all([
      fetchPublicRecordResilient('accommodations', slug),
      withTimeout(
        fetchCollectionPage('accommodations', [], { limit: 20, offset: 0 }),
        6000,
        { rows: [] as RecordRow[], total: 0 }
      ),
    ]);
    const published = item && isPublishedRecord(item) ? item : null;
    const others = published
      ? (stayPage?.rows ?? [])
          .filter(isPublishedRecord)
          .filter((row) => String(row?.id) !== String(published.id || ''))
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
      tours: (tours ?? []).slice(0, 12),
    });
  } catch (error) {
    console.warn('[Public] loadAccommodationDetail failed:', slug, error);
    return { item: null, others: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

export async function loadExploreDetail(slug: string) {
  try {
    const [place, placePage] = await Promise.all([
      fetchPublicRecordResilient('explore', slug),
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
      ? (placePage?.rows ?? [])
          .filter(isPublishedRecord)
          .filter((row) => String(row?.id) !== String(published.id || ''))
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
      tours: (tours ?? []).slice(0, 12),
    });
  } catch (error) {
    console.warn('[Public] loadExploreDetail failed:', slug, error);
    return { place: null, others: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

/** Fast category page payload — avoids loading full country parks/explore on every category click. */
export async function loadCategoryPageData(countrySlug: string, categorySlug: string) {
  const bare =
    canonicalCountrySlug(countrySlug) ||
    countrySlugFromLanding(countrySlug) ||
    normalizeSlug(countrySlug).replace(/-safaris$/, '');
  const fallbackName = countryLabelFromSlug(bare);
  try {
    const [categoriesPage, countryRow, tourRows] = await Promise.all([
      withTimeout(
        fetchCollectionPage('categories', [], {
          columns: listColumns('categories'),
          limit: 120,
          offset: 0,
        }),
        8000,
        { rows: [] as RecordRow[], total: 0 }
      ),
      fetchPublicRecordResilient('countries', bare),
      withTimeout(resolvePublicTours({ country: fallbackName || bare, limit: 48 }), 10000, [] as RecordRow[]),
    ]);
    const categories = (categoriesPage?.rows ?? [])
      .filter(isPublishedRecord)
      .filter((row) => categoryMatchesCountry(row, bare));
    const category = findCategoryBySlug(categories, categorySlug, bare);
    const countryTours = (tourRows ?? []).filter((row) => matchesCountry(row, bare));
    const pool = countryTours.length ? countryTours : tourRows ?? [];
    const filteredTours = filterToursByCategory(pool, category, categorySlug);
    const countryName = publicCountryLabel(countryRow, bare) || fallbackName;
    const country: RecordRow =
      countryRow && isPublishedRecord(countryRow)
        ? countryRow
        : ({
            name: countryName,
            title: countryName,
            slug: bare,
          } as RecordRow);
    return toClientProps({
      country,
      category,
      categories,
      tours: filteredTours.length ? filteredTours : pool,
    });
  } catch (error) {
    console.warn('[Public] loadCategoryPageData failed:', bare, categorySlug, error);
    return {
      country: {
        name: fallbackName,
        title: fallbackName,
        slug: bare,
      } as RecordRow,
      category: null as RecordRow | null,
      categories: [] as RecordRow[],
      tours: [] as RecordRow[],
    };
  }
}

export async function loadStaticCategoryParams(): Promise<{ slug: string; category: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const page = await fetchCollectionPage('categories', [], {
      limit: STATIC_DETAIL_BUILD_LIMIT * 2,
      offset: 0,
    });
    const params: { slug: string; category: string }[] = [];
    for (const row of (page?.rows ?? []).filter(isPublishedRecord)) {
      const catSlug = categoryPublicSlug(row);
      if (!catSlug) continue;
      const countries = recordCountryValues(row);
      if (!countries.length) continue;
      for (const country of countries) {
        params.push({ slug: landingSlugForCountry(country), category: catSlug });
      }
    }
    const seen = new Set<string>();
    return params.filter((item) => {
      const key = `${item.slug}/${item.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, STATIC_DETAIL_BUILD_LIMIT * 2);
  } catch {
    return [];
  }
}

/** Slugs to pre-render at build time (ISR + CDN). */
export async function loadStaticTourParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
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
  if (skipStaticGenerationDuringBuild()) return [];
  const slugs = new Set<string>();
  for (const item of [...NAV_COUNTRIES, ...OTHER_DESTINATIONS]) {
    if (item.slug) slugs.add(item.slug);
  }
  return [...slugs].map((slug) => ({ slug }));
}

export async function loadStaticAccommodationParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const rows = await loadPublishedRecords('accommodations', [], {
      columns: 'id,slug,seo_slug,title,published',
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .filter((slug) => !FAKE_STAY_SLUG_RE.test(slug))
      .slice(0, STATIC_DETAIL_BUILD_LIMIT)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loadStaticParkParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
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
  if (skipStaticGenerationDuringBuild()) return [];
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
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const page = await fetchPublicSafariUpdatesPage({
      limit: STATIC_DETAIL_BUILD_LIMIT,
      offset: 0,
    });
    return page.rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export type PublicSafariUpdateNavItem = {
  title: string;
  href: string;
};

/** Recent safari updates for the header dropdown. */
export async function loadSafariUpdatesNav(limit = 8): Promise<PublicSafariUpdateNavItem[]> {
  try {
    const { posts } = await loadSafariUpdatesPageData({ limit, offset: 0 });
    return posts.slice(0, limit).map((post) => {
      const slug = publicRecordSlug(post) || String(post.id ?? '');
      return {
        title: getRecordTitle(post) || 'Safari update',
        href: slug ? `/safari-updates/${slug}` : '/safari-updates',
      };
    });
  } catch {
    return [];
  }
}

async function loadPublicNavDestinationsLive(): Promise<PublicDestination[]> {
  try {
    const rows = await withTimeout(
      fetchCollectionRecords('countries', [], {
        columns: listColumns('countries'),
        maxRows: 48,
      }).then((data) => data.filter(isPublishedRecord)),
      8000,
      [] as RecordRow[]
    );
    return mergePublicDestinations(rows);
  } catch {
    return mergePublicDestinations([]);
  }
}

/** Header/footer destination chips — cached across requests to avoid duplicate country queries. */
export async function loadPublicNavDestinations(): Promise<PublicDestination[]> {
  return unstable_cache(loadPublicNavDestinationsLive, ['public-nav-destinations'], {
    revalidate: CMS_PUBLIC_REVALIDATE_SECONDS,
    tags: [CMS_PUBLIC_CACHE_TAG, 'collection:countries'],
  })();
}
