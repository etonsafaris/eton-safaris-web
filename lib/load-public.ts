import {
  CMS_PUBLIC_CACHE_TAG,
  CMS_PUBLIC_REVALIDATE_SECONDS,
  PUBLIC_DETAIL_REVALIDATE_SECONDS,
} from '@/lib/cms-public-cache';
/** All loaders delegate to `@/lib/data-server` → `getAivenPool()` (same pool as admin). */
import { enrichAccommodationParkFields } from '@/lib/accommodation-park';
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
  publicCountrySlug,
  recordCountryValues,
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
  findRecordBySlug,
  getRecordTitle,
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
import {
  enrichCountryRecordForPublicPage,
  isCountryPageShellCountry,
} from '@/lib/country-heroes';
import { fallbackHomeCountryRows, orderHomeCountryRows, sanitizeCountryRowForDisplay } from '@/lib/home-page-fallback';
import { resolveCountryPageCategories } from '@/lib/country-page-categories';
import { resolveSafariUpdatePost } from '@/lib/safari-update-load';
import { EMPTY_SAFARI_UPDATE_DETAIL } from '@/lib/safe-public-load';
import type { RecordRow } from '@/lib/types';

import { STATIC_PARAM_COLUMNS, staticBuildParamLimit } from '@/lib/static-build';

function staticDetailBuildLimit() {
  return staticBuildParamLimit();
}

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
  const navRows: RecordRow[] = [];

  for (const nav of NAV_COUNTRIES) {
    let match: RecordRow | undefined = published.find((row) => recordMatchesCountrySlug(row, nav.slug));
    if (!match) {
      match =
        (await withTimeout(fetchRecordByPublicSlug('countries', nav.slug), 4500, null)) ?? undefined;
      if (match?.id != null) {
        match =
          (await withTimeout(
            fetchCollectionRecordById('countries', String(match.id)),
            4500,
            match
          )) ?? undefined;
      }
    }
    if (match && isPublishedRecord(match)) {
      navRows.push(match);
      if (match.id != null) usedIds.add(String(match.id));
    } else {
      navRows.push({ slug: nav.slug, name: nav.name, title: nav.name, status: 'published' });
    }
  }

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
  } catch {
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

/** One homepage pass: cached 15 min so origin does not hit Aiven on every visitor. */
export async function loadHomePageBundle() {
  return unstable_cache(loadHomePageBundleLive, ['home-page-bundle-v20-slim'], {
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
    console.warn('[Public] Home bundle failed:', error);
    try {
      const data = await loadHomePageData();
      if (!data.tours?.length) return instantHomeFallbackBundle();
      return {
        data,
        content: null,
        destinations: mergePublicDestinations(data.countries ?? []),
      };
    } catch {
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
      countPublicTable('tours'),
    ]);
    let tours = tourPage.rows.filter(isPublishedRecord);
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
      ['tours-page-data-v7-paged', String(limit), String(offset)],
      ['collection:tours'],
      async () => {
        const loaded = await loadToursPageDataLive(limit, offset);
        if (offset === 0 && !loaded.tours.length) throw new Error('Public tours listing returned no packages');
        return loaded;
      }
    );
  } catch (error) {
    console.warn('[Public] Tours listing cache skipped:', error);
    return loadToursPageDataLive(limit, offset);
  }
}

export async function loadDestinationsIndexCountries() {
  return cachedPublic(['destinations-index-countries-v1'], ['collection:countries'], () =>
    loadPublishedRecords('countries')
  );
}

const COUNTRY_HERO_FIELDS = [
  'id',
  'tagline',
  'headline',
  'hero_title',
  'image_url',
  'social_image_url',
  'cover_image',
  'featured_image',
  'description_title',
] as const;

function fillEmptyCountryFields(base: RecordRow, extra: RecordRow): RecordRow {
  const next: RecordRow = { ...extra, ...base };
  for (const key of COUNTRY_HERO_FIELDS) {
    const current = String(base[key] ?? '').trim();
    const incoming = extra[key];
    if (!current && incoming != null && String(incoming).trim()) {
      next[key] = incoming;
    }
  }
  return next;
}

/** Country pages must keep the admin headline and featured image even if the detail query times out. */
async function countryRowWithHero(slug: string, country: RecordRow | null): Promise<RecordRow | null> {
  let row = country;
  if (isCountryPageShellCountry(row)) {
    const rows = await withTimeout(
      fetchCollectionRecords('countries', [], {
        columns: listColumns('countries'),
        maxRows: 48,
      }).then((data) => data.filter(isPublishedRecord)),
      6000,
      [] as RecordRow[]
    );
    const match = rows.find((item) => recordMatchesCountrySlug(item, slug));
    if (match) row = row ? fillEmptyCountryFields(row, match) : match;
  }
  return enrichCountryRecordForPublicPage(slug, row);
}

export async function loadCountryPageData(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    const cached = await cachedPublic(
      ['country-page-data-v16-related', normalized],
      ['collection:countries', `country:${normalized}`],
      async () => {
        const data = (await loadCountryPageDataInner(normalized)) ?? EMPTY_COUNTRY_PAGE_DATA;
        if (!isCountryPageShellCountry(data.country)) return data;
        const hydrated = await countryRowWithHero(normalized, data.country);
        return hydrated ? { ...data, country: hydrated } : data;
      }
    );
    return cached;
  } catch (error) {
    console.warn('[Public] loadCountryPageData failed:', slug, error);
    return withCountryPageFallback(EMPTY_COUNTRY_PAGE_DATA, normalized);
  }
}

/** Never throws — one country load, shared with the page cache. */
export async function loadCountryPageDataResilient(slug: string): Promise<CountryPageData> {
  const normalized = normalizeSlug(slug);
  try {
    const data = await loadCountryPageData(normalized);
    return withCountryPageFallback(data, normalized);
  } catch (error) {
    console.warn('[Public] loadCountryPageDataResilient failed:', normalized, error);
    return withCountryPageFallback(EMPTY_COUNTRY_PAGE_DATA, normalized);
  }
}

type CountryPageLoadOptions = { requirePublishedCountry?: boolean };

async function loadCountryPageDataInner(
  slug: string,
  options?: CountryPageLoadOptions
): Promise<CountryPageData | null> {
  const [countryMeta, categoriesRaw] = await Promise.all([
    fetchPublicRecordResilient('countries', slug),
    fetchCollectionRecords('categories', [], {
      columns: listColumns('categories'),
      maxRows: 80,
    })
      .then((rows) => rows.filter(isPublishedRecord))
      .catch(() => [] as RecordRow[]),
  ]);
  if (options?.requirePublishedCountry) {
    if (!countryMeta || !isPubliclyVisibleRecord(countryMeta)) return null;
  }

  const country: RecordRow | null = countryMeta;

  if (options?.requirePublishedCountry && (!country || !isPubliclyVisibleRecord(country))) {
    return null;
  }
  const countryCategories = categoriesRaw.filter((row) => categoryMatchesCountry(row, slug));
  const countryName =
    (country ? publicCountryLabel(country, slug) : '') ||
    pickString(country || {}, ['name', 'title']) ||
    slug;
  const [tours, parks, places] = await Promise.all([
    resolvePublicTours({ country: countryName, limit: 24 }).catch(() => [] as RecordRow[]),
    relatedPublicRecords('national_park', ['national_parks', 'parks'], countryName, undefined, 12),
    relatedPublicRecords('explore', [], countryName, undefined, 12),
  ]);
  const matchedTours = tours.filter((row) => matchesCountry(row, slug));
  const toursForPage = matchedTours.length ? matchedTours : tours;
  const categories = resolveCountryPageCategories(slug, countryCategories, toursForPage);
  const fallbackCountry: RecordRow = {
    name: countryName,
    title: countryName,
    slug,
  };
  const displayCountry =
    country && isPubliclyVisibleRecord(country)
      ? await countryRowWithHero(slug, country)
      : options?.requirePublishedCountry
        ? null
        : countryName
          ? await countryRowWithHero(slug, fallbackCountry)
          : null;

  if (options?.requirePublishedCountry && !displayCountry) return null;

  return {
    country: displayCountry,
    categories,
    tours: toursForPage.filter(isPubliclyVisibleRecord),
    parks,
    places,
  };
}

/** Admin-synced destination detail — published CMS row only; null when hidden/deleted. */
export async function loadCountryPageDataSynced(slug: string): Promise<CountryPageData | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return cachedPublic(
    ['country-page-sync-v7-related', normalized],
    ['collection:countries', `country:${normalized}`],
    () => loadCountryPageDataInner(normalized, { requirePublishedCountry: true }),
    PUBLIC_DETAIL_REVALIDATE_SECONDS
  );
}

/**
 * Public `/destinations/[slug]` — resilient load (never 404 for known destinations when DB is slow).
 * Uses published CMS data when available; falls back to shell + tours/categories like `/uganda-safaris`.
 */
export async function loadDestinationCountryPage(slug: string): Promise<CountryPageData> {
  return loadCountryPageDataResilient(slug);
}

async function loadTourDetailLive(slug: string, synced = false) {
  try {
    const tour = synced
      ? await withTimeout(fetchSyncedPublicRecord('tours', slug), 10000, null)
      : await fetchPublicRecordResilient('tours', slug);
    if (!tour || !isPubliclyVisibleRecord(tour)) {
      return { tour: null, related: [] as RecordRow[] };
    }
    const country = tour ? pickString(tour, ['country']) : '';
    const category = tour ? pickString(tour, ['category']) : '';
    const relatedPool = await resolvePublicTours({
      country,
      limit: 8,
      excludeId: tour?.id != null ? String(tour.id) : undefined,
    }).catch(() => [] as RecordRow[]);
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

/** Tour detail route — same Aiven row as admin; 60s ISR; null tour when hidden/deleted. */
export async function loadTourDetailSynced(slug: string) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return { tour: null, related: [] as RecordRow[] };
  try {
    return await cachedPublic(
      ['tour-detail-sync-v2', normalized],
      ['collection:tours', `tour:${normalized}`],
      async () => {
        const loaded = await loadTourDetailLive(normalized, true);
        if (!loaded.tour) throw new Error('Tour detail empty');
        return loaded;
      },
      PUBLIC_DETAIL_REVALIDATE_SECONDS
    );
  } catch (error) {
    console.warn('[Public] Tour detail cache skipped:', normalized, error);
    return loadTourDetailLive(normalized, true);
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
  try {
    return await cachedPublic(
      ['safari-updates-page-v4-skip-empty', String(limit), String(offset)],
      ['collection:safari_updates'],
      async () => {
        const loaded = await loadSafariUpdatesPageDataLive(limit, offset);
        if (offset === 0 && !loaded.posts.length) throw new Error('Safari updates listing returned no posts');
        return loaded;
      }
    );
  } catch (error) {
    console.warn('[Public] Safari updates cache skipped:', error);
    return loadSafariUpdatesPageDataLive(limit, offset);
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

async function relatedPublicRecords(
  table: string,
  aliases: string[],
  country: string,
  excludeId?: string,
  limit = 8
): Promise<RecordRow[]> {
  const label = String(country || '').trim();
  const exclude = String(excludeId || '');
  const keep = (rows: RecordRow[]) =>
    (rows ?? [])
      .filter((row) => row && isPublishedRecord(row) && String(row.id ?? '') !== exclude)
      .slice(0, limit);
  if (!label) return [];
  try {
    const page = await withTimeout(
      fetchCollectionPage(table, aliases, {
        columns: listColumns(table, aliases),
        limit: limit + 4,
        offset: 0,
        filters: { country: label },
      }),
      8000,
      { rows: [] as RecordRow[], total: 0 }
    );
    const matched = keep(page.rows ?? []);
    if (matched.length) return matched;
    const broad = await withTimeout(
      fetchCollectionPage(table, aliases, {
        columns: listColumns(table, aliases),
        limit: 40,
        offset: 0,
      }),
      8000,
      { rows: [] as RecordRow[], total: 0 }
    );
    return (broad.rows ?? [])
      .filter(
        (row) =>
          row &&
          isPublishedRecord(row) &&
          String(row.id ?? '') !== exclude &&
          matchesCountry(row, label)
      )
      .slice(0, limit);
  } catch (error) {
    console.warn('[Public] Related records failed:', table, label, error);
    return [];
  }
}

async function loadParkDetailLive(slug: string) {
  try {
    const park = await fetchPublicRecordResilient('national_park', slug, ['national_parks', 'parks']);
    const published = park && isPublishedRecord(park) ? park : null;
    const country = published ? pickStoredString(published, ['country']) : '';
    const [tours, others] = published
      ? await Promise.all([
          withTimeout(
            resolvePublicTours({
              country,
              limit: 12,
            }),
            8000,
            [] as RecordRow[]
          ),
          relatedPublicRecords(
            'national_park',
            ['national_parks', 'parks'],
            country,
            published.id != null ? String(published.id) : '',
            8
          ),
        ])
      : [[], []];
    return toClientProps({
      park: published,
      others,
      tours: (tours ?? []).slice(0, 12),
      stays: [] as RecordRow[],
    });
  } catch (error) {
    console.warn('[Public] loadParkDetail failed:', slug, error);
    return { park: null, others: [] as RecordRow[], tours: [] as RecordRow[], stays: [] as RecordRow[] };
  }
}

export async function loadParkDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  return cachedPublic(
    ['park-detail-v5-related', normalized],
    ['collection:national_park', `park:${normalized}`],
    () => loadParkDetailLive(normalized)
  );
}

async function recentPublicSafariUpdates(excludeId?: string, limit = 8): Promise<RecordRow[]> {
  try {
    const page = await withTimeout(
      fetchPublicSafariUpdatesPage({ limit: 24, offset: 0 }),
      8000,
      { rows: [] as RecordRow[], total: 0 }
    );
    return (page.rows ?? [])
      .filter((row) => row && String(row.id ?? '') !== String(excludeId || ''))
      .slice(0, limit);
  } catch {
    return [];
  }
}

async function withRecentSafariUpdates<T extends { post: RecordRow | null; related: RecordRow[] }>(
  detail: T
): Promise<T> {
  if (!detail.post || (detail.related?.length ?? 0) > 0) return detail;
  const related = await recentPublicSafariUpdates(detail.post.id != null ? String(detail.post.id) : '');
  return related.length ? { ...detail, related } : detail;
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
      resolved && isPublishedRecord(resolved) ? resolved : null;
    const related = published
      ? (updatePage?.rows ?? [])
          .filter((row) => String(row?.id) !== String(published.id || ''))
          .slice(0, 20)
      : [];
    const country = published ? pickStoredString(published, ['country', 'category']) : '';
    const countryKey = country ? canonicalCountrySlug(country) || normalizeSlug(country) : '';
    const toursRaw = published
      ? await withTimeout(
          resolvePublicTours({
            country,
            limit: 24,
            excludeId: published.id != null ? String(published.id) : undefined,
          }),
          8000,
          [] as RecordRow[]
        )
      : [];
    const tours = countryKey
      ? (toursRaw ?? []).filter((row) => matchesCountry(row, countryKey))
      : toursRaw ?? [];
    const tourPool = tours.length ? tours : (toursRaw ?? []).slice(0, 12);
    return toClientProps(
      await withRecentSafariUpdates({
        post: published,
        related,
        tours: tourPool.slice(0, 12),
      })
    );
  } catch (error) {
    console.warn('[Public] loadSafariUpdateDetail failed:', slug, error);
    return { post: null, related: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

export async function loadSafariUpdateDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    return await cachedPublic(
      ['safari-update-detail-v6-one-read', normalized],
      ['collection:safari_updates', `safari_update:${normalized}`],
      async () => {
        const loaded = await loadSafariUpdateDetailLive(normalized);
        if (!loaded.post) throw new Error('Safari update detail empty');
        return loaded;
      }
    );
  } catch (error) {
    console.warn('[Public] Safari update detail cache skipped:', normalized, error);
    return loadSafariUpdateDetailLive(normalized);
  }
}

/** Used by the detail page and recovery API — does not throw on a slow database. */
export async function loadSafariUpdateDetailResilient(slug: string) {
  const normalized = normalizeSlug(slug);
  try {
    const detail = await loadSafariUpdateDetail(normalized);
    if (detail.post) return withRecentSafariUpdates(detail);
    return detail;
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

async function loadAccommodationDetailLive(slug: string, synced = false) {
  try {
    const item = synced
      ? await withTimeout(fetchSyncedPublicRecord('accommodations', slug), 10000, null)
      : await fetchPublicRecordResilient('accommodations', slug);
    const published = item && isPubliclyVisibleRecord(item) ? item : null;
    const country = published ? pickStoredString(published, ['country']) : '';
    const [tours, others, parks] = published
      ? await Promise.all([
          withTimeout(
            resolvePublicTours({
              country,
              limit: 12,
              excludeId: published.id != null ? String(published.id) : undefined,
            }),
            8000,
            [] as RecordRow[]
          ),
          relatedPublicRecords(
            'accommodations',
            [],
            country,
            published.id != null ? String(published.id) : '',
            8
          ),
          relatedPublicRecords('national_park', ['national_parks', 'parks'], country, undefined, 40),
        ])
      : [[], [], []];
    return toClientProps({
      item: published ? enrichAccommodationParkFields(published, parks) : null,
      others,
      tours: (tours ?? []).slice(0, 12),
    });
  } catch (error) {
    console.warn('[Public] loadAccommodationDetail failed:', slug, error);
    return { item: null, others: [] as RecordRow[], tours: [] as RecordRow[] };
  }
}

export async function loadAccommodationDetail(slug: string) {
  const normalized = normalizeSlug(slug);
  return loadAccommodationDetailLive(normalized);
}

/** Stay detail route — admin-synced visibility; 60s ISR. */
export async function loadAccommodationDetailSynced(slug: string) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return { item: null, others: [] as RecordRow[], tours: [] as RecordRow[] };
  return cachedPublic(
    ['accommodation-detail-sync-v6-park', normalized],
    ['collection:accommodations', `accommodation:${normalized}`],
    () => loadAccommodationDetailLive(normalized, true),
    PUBLIC_DETAIL_REVALIDATE_SECONDS
  );
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
          relatedPublicRecords(
            'explore',
            [],
            countryKey,
            published.id != null ? String(published.id) : '',
            8
          ),
        ])
      : [[], []];
    return toClientProps({
      place: published,
      others,
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
    const limit = staticDetailBuildLimit();
    const featured = await fetchFeaturedTours(limit);
    const fromFeatured = featured
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug));
    if (fromFeatured.length) {
      return fromFeatured.map((slug) => ({ slug }));
    }
    const rows = await loadPublishedRecords('tours', [], {
      columns: STATIC_PARAM_COLUMNS.tours,
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .slice(0, limit)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loadStaticDestinationParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  const slugs = new Set<string>();
  for (const item of [...NAV_COUNTRIES, ...OTHER_DESTINATIONS]) {
    if (item.slug) slugs.add(item.slug);
  }
  try {
    const rows = await loadPublishedRecords('countries', [], {
      columns: STATIC_PARAM_COLUMNS.countries,
    });
    for (const row of rows) {
      const slug = publicRecordSlug(row) || publicCountrySlug(row);
      if (slug) slugs.add(slug);
    }
  } catch {
    // seeded NAV/OTHER slugs still pre-render
  }
  return [...slugs].map((slug) => ({ slug }));
}

export async function loadStaticAccommodationParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const rows = await loadPublishedRecords('accommodations', [], {
      columns: STATIC_PARAM_COLUMNS.accommodations,
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .filter((slug) => !FAKE_STAY_SLUG_RE.test(slug))
      .slice(0, staticDetailBuildLimit())
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loadStaticParkParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const rows = await loadPublishedRecords('national_park', ['national_parks', 'parks'], {
      columns: STATIC_PARAM_COLUMNS.national_park,
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .slice(0, staticDetailBuildLimit())
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
      .slice(0, staticDetailBuildLimit())
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loadStaticSafariUpdateParams(): Promise<{ slug: string }[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  try {
    const rows = await loadPublishedRecords('safari_updates', [], {
      columns: STATIC_PARAM_COLUMNS.safari_updates,
    });
    return rows
      .map((row) => publicRecordSlug(row))
      .filter((slug): slug is string => Boolean(slug))
      .slice(0, staticDetailBuildLimit())
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
