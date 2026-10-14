import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { normalizeSlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';
import { pickString, publicRecordSlug } from '@/lib/data';

const LANDING_COUNTRY_SLUGS = new Set(
  [...NAV_COUNTRIES, ...OTHER_DESTINATIONS].map((item) => item.slug)
);

export type CmsKind = 'page' | 'country';

export type ResolvedCmsSlug = {
  kind: CmsKind;
  canonical: string;
  countrySlug?: string;
};

const PAGE_ALIASES: Record<string, string> = {
  about: 'about-us',
  'about-us': 'about-us',
  terms: 'terms-of-services',
  'terms-of-service': 'terms-of-services',
  'terms-of-services': 'terms-of-services',
  privacy: 'privacy-policies',
  'privacy-policy': 'privacy-policies',
  'privacy-policies': 'privacy-policies',
  community: 'community-support',
  'community-support': 'community-support',
  contact: 'contact-us',
  'contact-us': 'contact-us',
  agency: 'tours-and-travel-agency',
  'travel-agency': 'tours-and-travel-agency',
  'tours-and-travel-agency': 'tours-and-travel-agency',
  home: 'home-page',
  homepage: 'home-page',
  'home-page': 'home-page',
};

export const CORE_PAGE_SLUGS = [
  'about-us',
  'terms-of-services',
  'privacy-policies',
  'community-support',
  'contact-us',
  'tours-and-travel-agency',
] as const;

export function landingSlugForCountry(countrySlug: string): string {
  const slug = publicSlugFromInput(countrySlug).replace(/-safaris$/, '') || normalizeSlug(countrySlug).replace(/-safaris$/, '');
  return `${slug}-safaris`;
}

export function countrySlugFromLanding(slug: string): string {
  return publicSlugFromInput(slug).replace(/-safaris$/, '');
}

/** Instant page title from a URL slug. Does not read the database. */
export function titleFromPublicSlug(slug: string): string {
  const cleaned = String(slug || '')
    .replace(/-safaris$/, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Eton Safaris';
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Accepts a CMS slug, /path, or full URL and returns a single URL segment. */
export function publicSlugFromInput(raw: string): string {
  let value = String(raw || '').trim();
  if (!value) return '';
  try {
    if (/^https?:\/\//i.test(value)) value = new URL(value).pathname;
  } catch {
    // keep the original value
  }
  const segment = value.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '').split('/').filter(Boolean).pop() || '';
  return normalizeSlug(segment);
}

export function isDedicatedLandingCountry(slug: string): boolean {
  return LANDING_COUNTRY_SLUGS.has(countrySlugFromLanding(slug));
}

export function isCoreLandingCountry(slug: string): boolean {
  return isDedicatedLandingCountry(slug);
}

export function pagePublicPath(slug: string): string {
  const key = normalizeSlug(slug);
  return `/${PAGE_ALIASES[key] || key}`;
}

/** About, Community, and the other fixed pages share one slug in the editor and on the site. */
export function canonicalPageSlug(slug: string): string {
  const key = publicSlugFromInput(slug);
  return PAGE_ALIASES[key] || key;
}

/** CMS slug stored on landing_pages (uganda-safaris). Never a public menu URL. */
export function landingCmsSlug(slug: string): string {
  const key = publicSlugFromInput(slug);
  if (!key) return '';
  if (isDedicatedLandingCountry(key) || key.endsWith('-safaris')) {
    return landingSlugForCountry(key);
  }
  return key;
}

/** Public website country page. Header, footer, home, chips, and /{country}-safaris aliases use this. */
export function destinationPublicPath(slug: string): string {
  const country = countrySlugFromLanding(slug);
  return country ? `/destinations/${country}` : '/destinations';
}

/**
 * Public path for anything that used to be a conversion landing.
 * Always the country destination page — guests never land on LandingPageContent.
 */
export function landingPublicPath(slug: string): string {
  return destinationPublicPath(slug);
}

/** Admin-only conversion preview at /landing/{country}-safaris. Public visitors are redirected. */
export function landingPreviewPath(slug: string): string {
  const key = landingCmsSlug(slug);
  return key ? `/landing/${key}` : '/admin/landing_pages';
}

export function explorePlacePath(place: RecordRow): string {
  const placeSlug = publicRecordSlug(place);
  return placeSlug ? `/explore/${placeSlug}` : '/explore';
}

export function countryPlacePath(countrySlug: string, place: RecordRow): string {
  const country = countrySlugFromLanding(countrySlug);
  const placeSlug = publicRecordSlug(place);
  if (!placeSlug) return '/explore';
  if (isCoreLandingCountry(country) || normalizeSlug(countrySlug).endsWith('-safaris')) {
    return `/${landingSlugForCountry(country)}/${placeSlug}`;
  }
  return `/explore/${placeSlug}`;
}

const RESERVED_PUBLIC_FILES = /^(favicon\.ico|icon\.png|apple-icon\.png|icon-192\.png|eton-safaris-gorilla\.png|manifest\.webmanifest|robots\.txt|sitemap\.xml)$/i;
const PUBLIC_FILE_SEGMENT = /\.(ico|png|jpe?g|webp|svg|xml|txt|webmanifest|map)$/i;

function lastPathSegment(raw: string): string {
  let value = String(raw || '').trim();
  if (!value) return '';
  try {
    if (/^https?:\/\//i.test(value)) value = new URL(value).pathname;
  } catch {
    // keep the original value
  }
  return value.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '').split('/').filter(Boolean).pop() || '';
}

export function resolvePublicSlug(raw: string): ResolvedCmsSlug | null {
  const original = lastPathSegment(raw);
  if (!original) return null;
  if (RESERVED_PUBLIC_FILES.test(original) || PUBLIC_FILE_SEGMENT.test(original)) {
    return null;
  }
  const slug = publicSlugFromInput(raw);
  if (!slug) return null;
  if (RESERVED_PUBLIC_FILES.test(slug) || PUBLIC_FILE_SEGMENT.test(slug)) {
    return null;
  }
  if (/^(404|not-found|missing|undefined|null)$/i.test(slug)) {
    return null;
  }

  if (PAGE_ALIASES[slug]) {
    return { kind: 'page', canonical: PAGE_ALIASES[slug] };
  }

  if (isDedicatedLandingCountry(slug) || slug.endsWith('-safaris')) {
    return {
      kind: 'country',
      canonical: landingSlugForCountry(slug),
      countrySlug: countrySlugFromLanding(slug),
    };
  }

  const bareCountry = countrySlugFromLanding(slug);
  if (LANDING_COUNTRY_SLUGS.has(bareCountry)) {
    return {
      kind: 'country',
      canonical: landingSlugForCountry(bareCountry),
      countrySlug: bareCountry,
    };
  }

  return { kind: 'page', canonical: slug };
}

/**
 * Never hard-404 public CMS paths for unknown segments — treat as a soft page slug
 * unless the segment is a reserved static asset name.
 */
export function resolvePublicSlugLenient(raw: string): ResolvedCmsSlug | null {
  const strict = resolvePublicSlug(raw);
  if (strict) return strict;
  const slug = publicSlugFromInput(raw);
  if (!slug) return null;
  if (RESERVED_PUBLIC_FILES.test(slug) || PUBLIC_FILE_SEGMENT.test(slug)) {
    return null;
  }
  return { kind: 'page', canonical: slug };
}

export function matchCmsRecord(rows: RecordRow[], canonical: string, aliases: string[] = []): RecordRow | null {
  const wanted = new Set(
    [canonical, ...aliases]
      .map((item) => publicSlugFromInput(item) || normalizeSlug(item))
      .filter(Boolean)
  );

  const bySlug =
    rows.find((row) => {
      const slug =
        publicSlugFromInput(pickString(row, ['slug', 'seo_slug'])) ||
        normalizeSlug(pickString(row, ['slug', 'seo_slug']));
      return wanted.has(slug);
    }) || null;
  if (bySlug) return bySlug;

  const isCorePage = (CORE_PAGE_SLUGS as readonly string[]).includes(canonical);
  if (isCorePage) {
    if (canonical === 'terms-of-services' || canonical === 'privacy-policies') {
      const byTitle =
        rows.find((row) => {
          const title = normalizeSlug(pickString(row, ['title', 'name', 'post_title']));
          return wanted.has(title);
        }) || null;
      if (byTitle) return byTitle;
    }
    return null;
  }

  return (
    rows.find((row) => {
      const title = normalizeSlug(pickString(row, ['title', 'name']));
      const country = normalizeSlug(pickString(row, ['country']));
      return wanted.has(title) || (country && wanted.has(country));
    }) || null
  );
}

export function pageAliases(canonical: string): string[] {
  return Object.entries(PAGE_ALIASES)
    .filter(([, value]) => value === canonical)
    .map(([key]) => key);
}
