import { NAV_COUNTRIES } from '@/lib/collections';
import { recordMatchesCountrySlug } from '@/lib/country-match';
import { publicCountrySlug } from '@/lib/country-utils';
import { countryHeroRemoteFallback } from '@/lib/country-hero-fallback';
import { pickString } from '@/lib/data';
import { mergePublicDestinations, type PublicDestination } from '@/lib/public-destinations';
import type { HomePageContent } from '@/lib/home-page-content';
import { resolveHomePageContent, type HomePagePayload, normalizeHomePagePayload } from '@/lib/home-page-payload';
import type { RecordRow } from '@/lib/types';

function countryRowSlug(row: RecordRow): string {
  return (
    publicCountrySlug(row) ||
    NAV_COUNTRIES.find((nav) => recordMatchesCountrySlug(row, nav.slug))?.slug ||
    ''
  );
}

/** Align CMS country row with official hero path when cover is missing or a conflicting duplicate. */
export function sanitizeCountryRowForDisplay(row: RecordRow): RecordRow {
  const slug = countryRowSlug(row);
  if (!slug) return row;
  const fallbackHero = countryHeroRemoteFallback(slug);
  const current = pickString(row, ['image_url', 'cover_image', 'featured_image', 'image']);
  const path = current.split('?')[0];
  const conflict =
    !current ||
    /supabase\.co\/storage/i.test(current) ||
    /\/heroes\/community/i.test(path) ||
    /eton-safaris-gorilla/i.test(path) ||
    (path.startsWith('/heroes/') && !current.startsWith('http'));
  if (!conflict) return row;
  return { ...row, image_url: fallbackHero, slug: row.slug || slug };
}

/** Minimal published country rows — official hero path only (no legacy thumbnails). */
export function fallbackHomeCountryRows(): RecordRow[] {
  return NAV_COUNTRIES.map(({ slug, name }) => ({
    slug,
    name,
    title: name,
    status: 'published',
    image_url: countryHeroRemoteFallback(slug),
  }));
}

/** Nav countries first with the fullest CMS row per slug (home hero + destination carousel). */
export function orderHomeCountryRows(rows: RecordRow[]): RecordRow[] {
  const published = rows.filter((row) => row && typeof row === 'object');
  const used = new Set<string>();
  const ordered: RecordRow[] = [];

  for (const nav of NAV_COUNTRIES) {
    const match = published.find((row) => recordMatchesCountrySlug(row, nav.slug));
    if (match) {
      ordered.push(match);
      if (match.id != null) used.add(String(match.id));
    } else {
      ordered.push({ slug: nav.slug, name: nav.name, title: nav.name, status: 'published' });
    }
  }

  for (const row of published) {
    if (row.id != null && used.has(String(row.id))) continue;
    const slug = publicCountrySlug(row);
    if (slug && NAV_COUNTRIES.some((nav) => nav.slug === slug)) continue;
    ordered.push(row);
  }

  return ordered;
}

export const STATIC_FALLBACK_HOME_PAYLOAD: HomePagePayload = {
  countries: fallbackHomeCountryRows(),
  tours: [],
  updates: [],
  categories: [],
};

export function mergeHomePagePayload(
  live: HomePagePayload,
  fallback: HomePagePayload = STATIC_FALLBACK_HOME_PAYLOAD
): HomePagePayload {
  const countries = (live.countries.length
    ? orderHomeCountryRows(live.countries)
    : orderHomeCountryRows(fallback.countries)
  ).map(sanitizeCountryRowForDisplay);
  return {
    countries,
    tours: live.tours.length ? live.tours : fallback.tours,
    updates: live.updates.length ? live.updates : fallback.updates,
    categories: live.categories.length ? live.categories : fallback.categories,
  };
}

/** True when live CMS data is missing key home sections (before render-time merge). */
export function isHomeLiveDataSparse(data?: Partial<HomePagePayload> | null): boolean {
  const normalized = normalizeHomePagePayload(data);
  return (
    normalized.tours.length === 0 ||
    normalized.updates.length === 0 ||
    normalized.countries.length === 0 ||
    normalized.categories.length === 0
  );
}

export type HomePageRenderState = {
  data: HomePagePayload;
  homeContent: HomePageContent;
  destinations: PublicDestination[];
  needsClientRefresh: boolean;
};

export function prepareHomePageRenderState(bundle?: {
  data?: Partial<HomePagePayload> | null;
  content?: HomePageContent | null;
  destinations?: PublicDestination[];
} | null): HomePageRenderState {
  const needsClientRefresh = isHomeLiveDataSparse(bundle?.data);
  const data = mergeHomePagePayload(normalizeHomePagePayload(bundle?.data));
  const homeContent = resolveHomePageContent(bundle?.content ?? null);
  const destinations =
    bundle?.destinations?.length ? bundle.destinations : mergePublicDestinations(data.countries);
  return { data, homeContent, destinations, needsClientRefresh };
}
