import { NAV_COUNTRIES } from '@/lib/collections';
import { recordMatchesCountrySlug } from '@/lib/country-match';
import { publicCountrySlug } from '@/lib/country-utils';
import { pickAivenMediaFromRecord } from '@/lib/content-image';
import { pickString } from '@/lib/data';
import { resolvePublicCmsImage } from '@/lib/public-image';
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

/** Keep only admin-uploaded covers on public country cards; strip stock/dead URLs. */
export function sanitizeCountryRowForDisplay(row: RecordRow): RecordRow {
  const slug = countryRowSlug(row);
  const adminImage =
    pickAivenMediaFromRecord(row) ||
    resolvePublicCmsImage(pickString(row, ['image_url', 'cover_image', 'featured_image', 'image']));
  if (adminImage) {
    return { ...row, image_url: adminImage, slug: row.slug || slug };
  }
  return {
    ...row,
    image_url: '',
    cover_image: '',
    featured_image: '',
    image: '',
    slug: row.slug || slug,
  };
}

/** Minimal published country rows — text only until admin sets covers. */
export function fallbackHomeCountryRows(): RecordRow[] {
  return NAV_COUNTRIES.map(({ slug, name }) => ({
    slug,
    name,
    title: name,
    status: 'published',
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
/** Only flag client refresh when the server bundle had no tours — not when optional slices are empty. */
export function isHomeLiveDataSparse(data?: Partial<HomePagePayload> | null): boolean {
  const normalized = normalizeHomePagePayload(data);
  return normalized.tours.length === 0;
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
