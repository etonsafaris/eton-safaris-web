import { NAV_COUNTRIES } from '@/lib/collections';
import { mergePublicDestinations, type PublicDestination } from '@/lib/public-destinations';
import type { HomePageContent } from '@/lib/home-page-content';
import { resolveHomePageContent, type HomePagePayload, normalizeHomePagePayload } from '@/lib/home-page-payload';
import type { RecordRow } from '@/lib/types';

/** Minimal published country rows so destination + hero sections always have content. */
export function fallbackHomeCountryRows(): RecordRow[] {
  return NAV_COUNTRIES.map(({ slug, name }) => ({
    slug,
    name,
    title: name,
    status: 'published',
  }));
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
  return {
    countries: live.countries.length ? live.countries : fallback.countries,
    tours: live.tours.length ? live.tours : fallback.tours,
    updates: live.updates.length ? live.updates : fallback.updates,
    categories: live.categories.length ? live.categories : fallback.categories,
  };
}

/** True when live CMS data is missing key home sections (before render-time merge). */
export function isHomeLiveDataSparse(data?: Partial<HomePagePayload> | null): boolean {
  const normalized = normalizeHomePagePayload(data);
  return normalized.tours.length === 0 || normalized.updates.length === 0 || normalized.countries.length === 0;
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
