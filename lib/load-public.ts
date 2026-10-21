import {
  CMS_PUBLIC_CACHE_TAG,
  CMS_PUBLIC_REVALIDATE_SECONDS,
  PUBLIC_DETAIL_REVALIDATE_SECONDS,
} from '@/lib/cms-public-cache';
/** All loaders delegate to `@/lib/data-server` → `getAivenPool()` (same pool as admin). */
import { countrySlugFromLanding, landingSlugForCountry, matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { unstable_cache } from 'next/cache';
import {
  categoryPublicSlug,
  canonicalCountrySlug,
  countryLabelFromSlug,
  filterToursByCategory,
  findCategoryBySlug,
  matchesCategoryValue,
  matchesCountry,
  publicCountryLabel,
  publicCountrySlug,
  recordCountryValues,
  categoryMatchesCountry,
  recordMatchesCountrySlug,
} from '@/lib/country-utils';
import {
  fetchCollectionRecordById,
  fetchCollectionRecords,
  countPublicTable,
  fetchCollectionPage,
  fetchPublicSafariUpdatesPage,
  fetchEastAfricaHomeTours,
  fetchFeaturedTours,
  fetchRecordByPublicSlug,
  fetchSyncedPublicRecord,
  resolvePublicTours,
  fetchCountryToursForCategories,
  fetchToursForCountryLabel,
  fetchCountryBySlugFast,
  fetchCategoriesAssignedToCountry,
  fetchStandardToursForCategory,
  findRecordBySlug,
  getRecordTitle,
  isGoogleOnlyTour,
  publicStandardTourSql,
  isPubliclyVisibleRecord,
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
import { skipStaticGenerationDuringBuild } from '@/lib/build-phase';
import {
  EMPTY_COUNTRY_PAGE_DATA,
  withCountryPageFallback,
  type CountryPageData,
} from '@/lib/country-page-fallback';
import { enrichCountryRecordForPublicPage } from '@/lib/country-heroes';
import { fallbackHomeCountryRows, orderHomeCountryRows, sanitizeCountryRowForDisplay } from '@/lib/home-page-fallback';
import { resolveCountryPageCategories } from '@/lib/country-page-categories';
import { getPublicRecordImage } from '@/lib/content-image';
import { EMPTY_SAFARI_UPDATE_DETAIL, rethrowDynamicServerError } from '@/lib/safe-public-load';
import type { RecordRow } from '@/lib/types';

import { queryActivePublicSlugs, slugsToStaticParams, staticBuildParamLimit } from '@/lib/static-build';

function staticDetailBuildLimit() {
  return staticBuildParamLimit();
}

/** Cap public DB waits so a slow Aiven round-trip cannot stall every page. */
const PUBLIC_QUERY_MS = 900;

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

/** One full Pages-module row. List columns omit the body, so a card lookup cannot show an admin edit. */
export async function loadCmsPage(slug: string) {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    const wanted = [slug, ...pageAliases(slug)].filter(Boolean);
    const seen = new Set<string>();
    for (const candidate of wanted) {
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const row = await fetchRecordByPublicSlug('pages', candidate);
      if (row && isPublishedRecord(row)) return row;
    }
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

/** Full CMS page. Do not swap in an empty result — that gets cached and hides the saved page. */
export async function loadCmsPageResilient(slug: string) {
  return loadCmsPage(slug);
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

/** Shared Next.js data cache for public CMS reads (bust via cms-public tag). */
function cachedPublic<T>(
  keyParts: string[],
  tags: string[],
  loader: () => Promise<T>,
  revalidateSeconds = CMS_PUBLIC_REVALIDATE_SECONDS
): Promise<T> {
  return unstable_cache(loader, keyParts, {
    revalidate: revalidateSeconds,
    tags: [CMS_PUBLIC_CACHE_TAG, ...tags],
  })();
}

/** One indexed read. A second attempt would keep the first query running and stall every other page. */
async function fetchPublicRecordResilient(
  table: string,
  slug: string,
  aliases: string[] = [],
  columns?: string
): Promise<RecordRow | null> {
  const select = columns || '*';
  return fetchRecordByPublicSlug(table, slug, aliases, select);
}

async function loadHomePageContentLive(): Promise<HomePageContent> {
  const row = await loadCmsPage(HOME_PAGE_SLUG);
  if (!row) throw new Error('home-page-miss');
  return parseHomePageContent(row);
}

export function loadHomePageContent(): Promise<HomePageContent | null> {
  return cachedPublic(['home-page-content-v3-footer'], ['collection:pages'], () => loadHomePageContentLive());
}

async function ensureNavCountryRecords(rows: RecordRow[]): Promise<RecordRow[]> {
  const published = rows.filter(isPublishedRecord);
  const usedIds = new Set<string>();

  const navRows = await Promise.all(
    NAV_COUNTRIES.map(async (nav) => {
      let match: RecordRow | undefined = published.find((row) => recordMatchesCountrySlug(row, nav.slug));
      if (!match) {
        match =
          (await withTimeout(fetchRecordByPublicSlug('countries', nav.slug), PUBLIC_QUERY_MS, null)) ??
          undefined;
      }
      if (match && isPublishedRecord(match)) {
        if (match.id != null) usedIds.add(String(match.id));
        return match;
      }
      return { slug: nav.slug, name: nav.name, title: nav.name, status: 'published' } as RecordRow;
    })
  );

  const rest: RecordRow[] = [];
  for (const row of published) {
    if (row.id != null && usedIds.has(String(row.id))) continue;
    const slug = publicCountrySlug(row);
    if (slug && NAV_COUNTRIES.some((item) => item.slug === slug)) continue;
    rest.push(row);
  }

  return [...navRows, ...rest];
}

async function loadHomePageCountriesSlice() {
  const rows = await fetchCollectionRecords('countries', [], {
    columns: listColumns('countries'),
    maxRows: 48,
  }).then((data) => data.filter(isPublishedRecord));
  const hydrated = await ensureNavCountryRecords(rows);
  return orderHomeCountryRows(hydrated);
}

async function loadHomePageCategoriesSlice() {
  const rows = await fetchCollectionRecords('categories', [], {
    columns: listColumns('categories'),
    maxRows: 64,
  });
  return rows.filter(isPublishedRecord);
}

async function loadHomePageToursSlice() {
  const tours = await fetchEastAfricaHomeTours(24);
  if (tours.length) return tours.slice(0, 24);
  return (await fetchFeaturedTours(12)).slice(0, 12);
}

async function loadHomePageUpdatesSlice() {
  const page = await fetchPublicSafariUpdatesPage({ limit: 8, offset: 0 });
  return page.rows.filter((row) => isPublishedRecord(row)).slice(0, 8);
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
    rethrowDynamicServerError(error);
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
  try {
    return await loadHomePageContent();
  } catch (error) {
    rethrowDynamicServerError(error);
    return null;
  }
}

async function loadHomePageBundleLive() {
  const [data, content] = await Promise.all([loadHomePageData(), loadHomePageContentCached()]);
  if (!data.tours?.length) {
    throw new Error('Home bundle had no tours');
  }
  const destinations = mergePublicDestinations(data.countries ?? []);
  return { data, content, destinations };
}

/** One homepage pass: cached so origin does not hit Aiven on every visitor. */
export async function loadHomePageBundle() {
  return unstable_cache(loadHomePageBundleLive, ['home-page-bundle-v23-instant'], {
    revalidate: CMS_PUBLIC_REVALIDATE_SECONDS,
    tags: [CMS_PUBLIC_CACHE_TAG, 'home-page'],
  })();
}

function instantHomeFallbackBundle() {
  const countries = fallbackHomeCountryRows();
  return {
    data: toClientProps({
      countries,
      tours: [] as RecordRow[],
      updates: [] as RecordRow[],
      categories: [] as RecordRow[],
    }),
    content: null,
    destinations: mergePublicDestinations(countries),
  };
}

/** Never throws — used by `/` and `/api/public/home-bundle`. One load, no abandoned retry. */
export async function loadHomePageBundleResilient() {
  try {
    return await loadHomePageBundle();
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Home bundle failed:', error);
    try {
      const data = await loadHomePageData();
      if (!data.tours?.length) return instantHomeFallbackBundle();
      return {
        data,
        content: null,
        destinations: mergePublicDestinations(data.countries ?? []),
      };
    } catch (retryError) {
      rethrowDynamicServerError(retryError);
      return instantHomeFallbackBundle();
    }
  }
}

async function loadAccommodationsPageDataLive(_limit: number, _offset: number) {
  return { rows: [] as RecordRow[], total: 0 };
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

async function loadToursPageDataLive(limit = 24, offset = 0) {
  try {
    const [tourPage, categories, countries, counted] = await Promise.all([
      withTimeout(
        fetchCollectionPage('tours', [], { columns: TOUR_LIST_COLUMNS, limit, offset }),
        8000,
        { rows: [] as RecordRow[], total: 0 }
      ),
      withTimeout(
        fetchCollectionRecords('categories', [], { columns: listColumns('categories'), maxRows: 80 }),
        4000,
        [] as RecordRow[]
      ),
      withTimeout(
        fetchCollectionRecords('countries', [], { columns: listColumns('countries'), maxRows: 48 }),
        4000,
        [] as RecordRow[]
      ),
      countPublicTable('tours', `WHERE ${publicStandardTourSql()}`),
    ]);
    let tours = tourPage.rows.filter((row) => isPublishedRecord(row) && !isGoogleOnlyTour(row));
    if (!tours.length && offset === 0) {
      tours = await withTimeout(resolvePublicTours({ limit }), 6000, [] as RecordRow[]).catch(
        () => [] as RecordRow[]
      );
    }
    const total = counted && counted > 0 ? counted : Math.max(tourPage.total, offset + tours.length);
    return toClientProps({
      tours,
      total,
      categories: categories.filter(isPublishedRecord),
      countries: countries.filter(isPublishedRecord),
    });
  } catch {
    const fallback = offset === 0 ? await resolvePublicTours({ limit }).catch(() => [] as RecordRow[]) : [];
    return {
      tours: fallback,
      total: fallback.length,
      categories: [] as RecordRow[],
      countries: [] as RecordRow[],
    };
  }
}

export async function loadToursPageData(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 24;
  const offset = options?.offset ?? 0;
  try {
    return await cachedPublic(
      ['tours-page-data-v10-standard25', String(limit), String(offset)],
      ['collection:tours'],
      async () => {
        const data = await loadToursPageDataLive(limit, offset);
        if (!data.tours?.length) throw new Error('Tours listing empty');
        return data;
      }
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Tours listing cache skipped:', error);
    return { tours: [] as RecordRow[], total: 0, categories: [] as RecordRow[], countries: [] as RecordRow[] };
  }
}

export async function loadDestinationsIndexCountries() {
  return cachedPublic(['destinations-index-countries-v1'], ['collection:countries'], () =>
    loadPublishedRecords('countries')
  );
}

export async function loadCountryPageData(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    return await cachedPublic(
      ['country-page-data-v32-instant', normalized],
      ['collection:countries', 'collection:categories', 'collection:tours', `country:${normalized}`],
      async () => {
        const data = await loadCountryPageDataInner(normalized);
        return withCountryPageFallback(data ?? EMPTY_COUNTRY_PAGE_DATA, normalized);
      },
      PUBLIC_DETAIL_REVALIDATE_SECONDS
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    try {
      const fresh = await loadCountryPageDataInner(normalized);
      return withCountryPageFallback(fresh ?? EMPTY_COUNTRY_PAGE_DATA, normalized);
    } catch (innerError) {
      rethrowDynamicServerError(innerError);
      console.warn('[Public] loadCountryPageData failed:', slug, innerError);
      return withCountryPageFallback(EMPTY_COUNTRY_PAGE_DATA, normalized);
    }
  }
}

/** Never throws — one country load, shared with the page cache. */
export async function loadCountryPageDataResilient(slug: string): Promise<CountryPageData> {
  const normalized = normalizeSlug(slug);
  try {
    const data = await loadCountryPageData(normalized);
    return withCountryPageFallback(data, normalized);
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] loadCountryPageDataResilient failed:', normalized, error);
    return withCountryPageFallback(EMPTY_COUNTRY_PAGE_DATA, normalized);
  }
}

type CountryPageLoadOptions = { requirePublishedCountry?: boolean };

/** Keep the country page inside ~1s even when Aiven is slow. */
const COUNTRY_PAGE_QUERY_MS = 900;

async function loadCountryPageDataInner(
  slug: string,
  options?: CountryPageLoadOptions
): Promise<CountryPageData | null> {
  const countryLabel = countryLabelFromSlug(slug) || slug;

  const [countryMeta, assignedCategories, tourRows] = await Promise.all([
    withTimeout(fetchCountryBySlugFast(slug), COUNTRY_PAGE_QUERY_MS, null),
    withTimeout(fetchCategoriesAssignedToCountry(countryLabel, 24), COUNTRY_PAGE_QUERY_MS, [] as RecordRow[]),
    withTimeout(fetchToursForCountryLabel(countryLabel, 25), COUNTRY_PAGE_QUERY_MS, [] as RecordRow[]),
  ]);

  const tours = (tourRows ?? []).filter((row) => !isGoogleOnlyTour(row) && isPubliclyVisibleRecord(row));

  let country: RecordRow | null =
    countryMeta && isPubliclyVisibleRecord(countryMeta) ? countryMeta : null;

  if (options?.requirePublishedCountry && (!country || !isPubliclyVisibleRecord(country))) {
    return null;
  }

  const categoriesRaw = (assignedCategories ?? [])
    .filter(isPublishedRecord)
    .filter((row) => categoryMatchesCountry(row, slug));
  const countryName =
    (country ? publicCountryLabel(country, slug) : '') || countryLabelFromSlug(slug) || slug;
  const parks: RecordRow[] = [];
  const places: RecordRow[] = [];

  const matchedTours = (tours ?? []).filter((row) => matchesCountry(row, slug));
  const toursForPage = (matchedTours.length ? matchedTours : tours).slice(0, 25);
  const categories = resolveCountryPageCategories(slug, categoriesRaw, toursForPage);

  const fallbackCountry: RecordRow = {
    name: countryName,
    title: countryName,
    slug,
    status: 'published',
  };
  const displayCountry =
    country && isPubliclyVisibleRecord(country)
      ? enrichCountryRecordForPublicPage(slug, country)
      : options?.requirePublishedCountry
        ? null
        : enrichCountryRecordForPublicPage(slug, fallbackCountry);

  if (options?.requirePublishedCountry && !displayCountry) return null;

  return {
    country: displayCountry,
    categories,
    tours: toursForPage,
    parks,
    places,
  };
}

/** Admin-synced destination detail — published CMS row only; null when hidden/deleted. */
export async function loadCountryPageDataSynced(slug: string): Promise<CountryPageData | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return cachedPublic(
    ['country-page-sync-v18-instant', normalized],
    ['collection:countries', 'collection:categories', 'collection:tours', `country:${normalized}`],
    () => loadCountryPageDataInner(normalized, { requirePublishedCountry: true }),
    PUBLIC_DETAIL_REVALIDATE_SECONDS
  );
}

/** Public country page. One read, returned as soon as it arrives. */
export async function loadDestinationCountryPage(slug: string): Promise<CountryPageData> {
  return loadCountryPageDataResilient(slug);
}

async function loadTourDetailLive(slug: string, synced = false) {
  const tour = synced
    ? await withTimeout(fetchSyncedPublicRecord('tours', slug), 8000, null)
    : await fetchPublicRecordResilient('tours', slug);
  if (!tour || !isPubliclyVisibleRecord(tour)) throw new Error(`tour-miss:${slug}`);
  const country = pickString(tour, ['country']);
  const category = pickString(tour, ['category']);
  const relatedPool = await withTimeout(
    resolvePublicTours({
      country,
      limit: 24,
      excludeId: tour.id != null ? String(tour.id) : undefined,
    }),
    900,
    [] as RecordRow[]
  );
  const sameCountry = (relatedPool ?? []).filter((row) => row && String(row.id) !== String(tour.id || ''));
  const sameCategory = category ? sameCountry.filter((row) => matchesCategoryValue(row, category)) : [];
  const related = (sameCategory.length >= 8 ? sameCategory : sameCountry).slice(0, 12);
  return toClientProps({
    tour,
    related,
  });
}

export async function loadTourDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    return await cachedPublic(
      ['tour-detail-v3-more', normalized],
      ['collection:tours', `tour:${normalized}`],
      () => loadTourDetailLive(normalized)
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] loadTourDetail failed:', normalized, error);
    return { tour: null, related: [] as RecordRow[] };
  }
}

/** Tour detail route — same Aiven row as admin; 60s ISR; null tour when hidden/deleted. */
export async function loadTourDetailSynced(slug: string) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return { tour: null, related: [] as RecordRow[] };
  try {
    return await cachedPublic(
      ['tour-detail-sync-v2', normalized],
      ['collection:tours', `tour:${normalized}`],
      () => loadTourDetailLive(normalized, true),
      PUBLIC_DETAIL_REVALIDATE_SECONDS
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Tour detail failed:', normalized, error);
    return { tour: null, related: [] as RecordRow[] };
  }
}

async function loadParksPageDataLive(_limit: number, _offset: number) {
  return { parks: [] as RecordRow[], total: 0 };
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
  const page = await withTimeout(
    fetchPublicSafariUpdatesPage({ limit, offset }),
    6000,
    { rows: [] as RecordRow[], total: 0 }
  );
  const posts = page.rows ?? [];
  if (!posts.length) throw new Error('Safari updates listing empty');
  return toClientProps({ posts, total: page.total });
}

export async function loadSafariUpdatesPageData(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 48;
  const offset = options?.offset ?? 0;
  try {
    return await cachedPublic(
      ['safari-updates-page-v5-real', String(limit), String(offset)],
      ['collection:safari_updates'],
      () => loadSafariUpdatesPageDataLive(limit, offset)
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Safari updates listing failed:', error);
    return { posts: [] as RecordRow[], total: 0 };
  }
}

async function loadExplorePageDataLive(_limit: number, _offset: number) {
  return { places: [] as RecordRow[], total: 0 };
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

async function loadOtherParks(park: RecordRow): Promise<RecordRow[]> {
  const country = pickStoredString(park, ['country']);
  const currentId = String(park.id || '');
  const currentSlug = publicRecordSlug(park);
  async function load(withCountry: boolean) {
    const page = await withTimeout(
      fetchCollectionPage('national_park', ['national_parks', 'parks'], {
        limit: 12,
        filters: withCountry && country ? { country } : undefined,
      }),
      8000,
      { rows: [] as RecordRow[], total: 0 }
    );
    return (page.rows || [])
      .filter((row) => isPubliclyVisibleRecord(row))
      .filter((row) => {
        const id = String(row.id || '');
        const slug = publicRecordSlug(row);
        if (currentId && id === currentId) return false;
        if (currentSlug && slug === currentSlug) return false;
        return Boolean(slug);
      })
      .slice(0, 8);
  }
  try {
    const sameCountry = country ? await load(true) : [];
    if (sameCountry.length) return sameCountry;
    return await load(false);
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Other parks failed:', error);
    return [];
  }
}

async function loadParkDetailLive(slug: string) {
  const park = await fetchPublicRecordResilient('national_park', slug, ['national_parks', 'parks']);
  const published = park && isPublishedRecord(park) ? park : null;
  if (!published) throw new Error(`park-miss:${slug}`);
  const country = pickStoredString(published, ['country']);
  const [tours, others] = await Promise.all([
    withTimeout(
      resolvePublicTours({
        country,
        limit: 12,
      }),
      2500,
      [] as RecordRow[]
    ),
    withTimeout(loadOtherParks(published), 2500, [] as RecordRow[]),
  ]);
  return toClientProps({
    park: published,
    others,
    tours: (tours ?? []).slice(0, 12),
    stays: [] as RecordRow[],
  });
}

export async function loadParkDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    return await cachedPublic(
      ['park-detail-v8-others', normalized],
      ['collection:national_park', `park:${normalized}`],
      () => loadParkDetailLive(normalized)
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] loadParkDetail failed:', normalized, error);
    return { park: null, others: [] as RecordRow[], tours: [] as RecordRow[], stays: [] as RecordRow[] };
  }
}

async function loadSafariUpdateDetailLive(slug: string) {
  const row = await fetchRecordByPublicSlug('safari_updates', slug);
  const published = row && isPublishedRecord(row) ? row : null;
  if (!published) throw new Error(`safari-update-miss:${slug}`);

  const country = pickStoredString(published, ['country', 'category']);
  const countryKey = country ? canonicalCountrySlug(country) || normalizeSlug(country) : '';
  const [updatePage, toursRaw] = await Promise.all([
    withTimeout(
      fetchPublicSafariUpdatesPage({ limit: 12, offset: 0 }),
      4000,
      { rows: [] as RecordRow[], total: 0 }
    ),
    withTimeout(
      resolvePublicTours({
        country,
        limit: 12,
        excludeId: published.id != null ? String(published.id) : undefined,
      }),
      4000,
      [] as RecordRow[]
    ),
  ]);
  const related = (updatePage?.rows ?? [])
    .filter((item) => String(item?.id) !== String(published.id || ''))
    .slice(0, 8);
  const tours = countryKey
    ? (toursRaw ?? []).filter((item) => matchesCountry(item, countryKey))
    : toursRaw ?? [];
  const tourPool = tours.length ? tours : (toursRaw ?? []).slice(0, 12);
  return toClientProps({
    post: published,
    related,
    tours: tourPool.slice(0, 12),
  });
}

export async function loadSafariUpdateDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    return await cachedPublic(
      ['safari-update-detail-v9-tours', normalized],
      ['collection:safari_updates', `safari_update:${normalized}`],
      () => loadSafariUpdateDetailLive(normalized)
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Safari update detail failed:', normalized, error);
    return { post: null, related: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

/** Used by the detail page and recovery API — does not throw on a slow database. */
export async function loadSafariUpdateDetailResilient(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    const detail = await loadSafariUpdateDetail(normalized);
    if (detail.post) return detail;
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] loadSafariUpdateDetailResilient failed:', normalized, error);
  }
  try {
    const post = await loadSafariUpdateArticle(normalized);
    if (post) return { post, related: [] as RecordRow[], tours: [] as RecordRow[] };
  } catch (error) {
    rethrowDynamicServerError(error);
  }
  return EMPTY_SAFARI_UPDATE_DETAIL;
}

/** One saved row, including the article and post blocks. An empty miss is not cached. */
export async function loadSafariUpdateArticle(slug: string): Promise<RecordRow | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  try {
    return await cachedPublic(
      ['safari-update-article-v1', normalized],
      ['collection:safari_updates', `safari_update:${normalized}`],
      async () => {
        const row = await fetchRecordByPublicSlug('safari_updates', normalized);
        if (!row || !isPublishedRecord(row)) throw new Error(`safari-update-miss:${normalized}`);
        return toClientProps(row);
      }
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    return null;
  }
}

/** The featured image saved for a public page, ready for the first HTML. */
export async function loadPublicHeroImage(table: string, slug: string, aliases: string[] = []): Promise<string> {
  const normalized = normalizeSlug(slug);
  if (!normalized || !/^[a-z_][a-z0-9_]*$/i.test(table)) return '';
  const narrow = 'id,slug,seo_slug,name,title,image_url,social_image_url';
  try {
    const row = await withTimeout(
      fetchRecordByPublicSlug(table, normalized, aliases, narrow),
      2500,
      null
    );
    const image = getPublicRecordImage(row);
    if (image) return image;
  } catch {
    /* a missing column falls through to the full row */
  }
  try {
    const row = await withTimeout(fetchRecordByPublicSlug(table, normalized, aliases), 2500, null);
    return getPublicRecordImage(row) || '';
  } catch (error) {
    rethrowDynamicServerError(error);
    return '';
  }
}

/** First saved photo for a listing hero, so the image tag is in the first HTML. */
export async function loadFirstListingHero(table: string): Promise<string> {
  if (!/^[a-z_][a-z0-9_]*$/i.test(table)) return '';
  try {
    const page = await withTimeout(
      fetchCollectionPage(table, [], { limit: 4, offset: 0 }),
      2500,
      { rows: [] as RecordRow[], total: 0 }
    );
    const row = (page.rows ?? []).find((item) => item && isPublishedRecord(item) && getPublicRecordImage(item));
    return getPublicRecordImage(row) || '';
  } catch (error) {
    rethrowDynamicServerError(error);
    return '';
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
    rethrowDynamicServerError(error);
    console.warn('[Public] Safari updates listing resilient load failed:', error);
    return { posts: [] as RecordRow[], total: 0 };
  }
}

async function loadOtherAccommodations(item: RecordRow): Promise<RecordRow[]> {
  const country = pickStoredString(item, ['country']);
  const currentId = String(item.id || '');
  const currentSlug = publicRecordSlug(item);
  async function load(withCountry: boolean) {
    const page = await withTimeout(
      fetchCollectionPage('accommodations', [], {
        limit: 12,
        filters: withCountry && country ? { country } : undefined,
      }),
      8000,
      { rows: [] as RecordRow[], total: 0 }
    );
    return (page.rows || [])
      .filter((row) => isPubliclyVisibleRecord(row))
      .filter((row) => {
        const id = String(row.id || '');
        const slug = publicRecordSlug(row);
        if (currentId && id === currentId) return false;
        if (currentSlug && slug === currentSlug) return false;
        return Boolean(slug);
      })
      .slice(0, 8);
  }
  try {
    const sameCountry = country ? await load(true) : [];
    if (sameCountry.length) return sameCountry;
    return await load(false);
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Other accommodations failed:', error);
    return [];
  }
}

async function loadAccommodationDetailLive(slug: string, synced = false) {
  const item = synced
    ? await withTimeout(fetchSyncedPublicRecord('accommodations', slug), 8000, null)
    : await fetchPublicRecordResilient('accommodations', slug);
  const published = item && isPubliclyVisibleRecord(item) ? item : null;
  if (!published) throw new Error(`stay-miss:${slug}`);
  const country = pickStoredString(published, ['country']);
  const [tours, others] = await Promise.all([
    withTimeout(
      resolvePublicTours({
        country,
        limit: 12,
        excludeId: published.id != null ? String(published.id) : undefined,
      }),
      2500,
      [] as RecordRow[]
    ),
    withTimeout(loadOtherAccommodations(published), 2500, [] as RecordRow[]),
  ]);
  return toClientProps({
    item: published,
    others,
    tours: (tours ?? []).slice(0, 12),
  });
}

export async function loadAccommodationDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    return await cachedPublic(
      ['stay-detail-v1-full', normalized],
      ['collection:accommodations', `stay:${normalized}`],
      () => loadAccommodationDetailLive(normalized)
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] loadAccommodationDetail failed:', normalized, error);
    return { item: null, others: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

/** Stay detail route — admin-synced visibility; 60s ISR. */
export async function loadAccommodationDetailSynced(slug: string) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return { item: null, others: [] as RecordRow[], tours: [] as RecordRow[] };
  try {
    return await cachedPublic(
      ['accommodation-detail-sync-v10-other-stays', normalized],
      ['collection:accommodations', `accommodation:${normalized}`],
      () => loadAccommodationDetailLive(normalized, true),
      PUBLIC_DETAIL_REVALIDATE_SECONDS
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Accommodation detail failed:', normalized, error);
    return { item: null, others: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

async function loadOtherPlaces(place: RecordRow): Promise<RecordRow[]> {
  const country = pickStoredString(place, ['country', 'country_slug', 'destination', 'nation']);
  const currentId = String(place.id || '');
  const currentSlug = publicRecordSlug(place);
  async function load(withCountry: boolean) {
    const page = await withTimeout(
      fetchCollectionPage('explore', [], {
        limit: 12,
        filters: withCountry && country ? { country } : undefined,
      }),
      8000,
      { rows: [] as RecordRow[], total: 0 }
    );
    return (page.rows || [])
      .filter((row) => isPubliclyVisibleRecord(row))
      .filter((row) => {
        const id = String(row.id || '');
        const slug = publicRecordSlug(row);
        if (currentId && id === currentId) return false;
        if (currentSlug && slug === currentSlug) return false;
        return Boolean(slug);
      })
      .slice(0, 8);
  }
  try {
    const sameCountry = country ? await load(true) : [];
    if (sameCountry.length) return sameCountry;
    return await load(false);
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Other places failed:', error);
    return [];
  }
}

export async function loadExploreDetail(slug: string) {
  try {
    const place = await fetchPublicRecordResilient('explore', slug);
    const published = place && isPublishedRecord(place) ? place : null;
    const countryKey = published
      ? pickStoredString(published, ['country', 'country_slug', 'destination', 'nation'])
      : '';
    const [tours, others] = published
      ? await Promise.all([
          withTimeout(
            resolvePublicTours({
              country: countryKey,
              limit: 12,
              excludeId: published.id != null ? String(published.id) : undefined,
            }),
            8000,
            [] as RecordRow[]
          ),
          withTimeout(loadOtherPlaces(published), 2500, [] as RecordRow[]),
        ])
      : [[], []];
    return toClientProps({
      place: published,
      others,
      tours: (tours ?? []).slice(0, 12),
    });
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] loadExploreDetail failed:', slug, error);
    return { place: null, others: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

async function loadCategoryPageDataLive(countrySlug: string, categorySlug: string) {
  const bare =
    canonicalCountrySlug(countrySlug) ||
    countrySlugFromLanding(countrySlug) ||
    normalizeSlug(countrySlug).replace(/-safaris$/, '');
  const fallbackName = countryLabelFromSlug(bare);
  const countryLabel = fallbackName || bare;
  const slugWords = categorySlug.replace(/-/g, ' ');

  try {
    const [categoriesPage, countryRow, directTours, countryPool] = await Promise.all([
      withTimeout(
        fetchCollectionPage('categories', [], {
          columns: listColumns('categories'),
          limit: 40,
          offset: 0,
          filters: { country: countryLabel },
        }),
        PUBLIC_QUERY_MS,
        { rows: [] as RecordRow[], total: 0 }
      ),
      withTimeout(fetchPublicRecordResilient('countries', bare), PUBLIC_QUERY_MS, null),
      withTimeout(fetchStandardToursForCategory(countryLabel, slugWords, 25), PUBLIC_QUERY_MS, [] as RecordRow[]),
      withTimeout(fetchToursForCountryLabel(countryLabel, 25), PUBLIC_QUERY_MS, [] as RecordRow[]),
    ]);

    const categories = resolveCountryPageCategories(
      bare,
      (categoriesPage?.rows ?? []).filter(isPublishedRecord),
      countryPool ?? []
    );
    const category = findCategoryBySlug(categories, categorySlug, bare);
    const categoryName = category ? pickString(category, ['name', 'title']) : '';

    let tours = (directTours ?? []).filter((row) => !isGoogleOnlyTour(row));
    if (!tours.length) {
      tours = filterToursByCategory(countryPool ?? [], null, categoryName || categorySlug);
      if (!tours.length && category) {
        tours = filterToursByCategory(countryPool ?? [], category, categorySlug);
      }
    }

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
      tours: tours.slice(0, 25),
    });
  } catch (error) {
    rethrowDynamicServerError(error);
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

/** Fast category page payload — one country category and its Standard Tours only. */
export async function loadCategoryPageData(countrySlug: string, categorySlug: string) {
  const bare =
    canonicalCountrySlug(countrySlug) ||
    countrySlugFromLanding(countrySlug) ||
    normalizeSlug(countrySlug).replace(/-safaris$/, '');
  const cat = normalizeSlug(categorySlug);
  try {
    return await cachedPublic(
      ['category-page-v3-parallel', bare, cat],
      ['collection:categories', 'collection:tours', `category:${bare}:${cat}`],
      () => loadCategoryPageDataLive(countrySlug, categorySlug),
      300
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    return loadCategoryPageDataLive(countrySlug, categorySlug);
  }
}

export async function loadStaticCategoryParams(): Promise<{ slug: string; category: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const page = await fetchCollectionPage('categories', [], {
      limit: staticDetailBuildLimit() * 2,
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
    }).slice(0, staticDetailBuildLimit() * 2);
  } catch {
    return [];
  }
}

/** Slugs to pre-render at build time (ISR + CDN). */
export async function loadStaticTourParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const fromDb = await queryActivePublicSlugs(['tours'], staticDetailBuildLimit());
    if (fromDb.length) return slugsToStaticParams(fromDb);
    const featured = await fetchFeaturedTours(staticDetailBuildLimit());
    return slugsToStaticParams(
      (featured ?? [])
        .map((row) => publicRecordSlug(row))
        .filter((slug): slug is string => Boolean(slug))
    );
  } catch {
    return [];
  }
}

export async function loadStaticDestinationParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  const slugs = new Set<string>();
  for (const item of [...NAV_COUNTRIES, ...OTHER_DESTINATIONS]) {
    if (item?.slug) slugs.add(item.slug);
  }
  try {
    const fromDb = await queryActivePublicSlugs(['countries'], 80);
    for (const slug of fromDb ?? []) slugs.add(slug);
  } catch {
    // seeded NAV/OTHER slugs still pre-render
  }
  return slugsToStaticParams([...slugs]);
}

export async function loadStaticAccommodationParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const fromDb = await queryActivePublicSlugs(['accommodations'], staticDetailBuildLimit());
    return slugsToStaticParams((fromDb ?? []).filter((slug) => !FAKE_STAY_SLUG_RE.test(slug)));
  } catch {
    return [];
  }
}

export async function loadStaticParkParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    return slugsToStaticParams(
      await queryActivePublicSlugs(['national_park', 'national_parks', 'parks'], staticDetailBuildLimit())
    );
  } catch {
    return [];
  }
}

export async function loadStaticExploreParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    return slugsToStaticParams(await queryActivePublicSlugs(['explore'], staticDetailBuildLimit()));
  } catch {
    return [];
  }
}

export async function loadStaticSafariUpdateParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    return slugsToStaticParams(
      await queryActivePublicSlugs(['safari_updates'], staticDetailBuildLimit())
    );
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
