import { countrySlugFromLanding } from '@/lib/cms-routes';
import { countryHeroRemoteFallback } from '@/lib/country-hero-fallback';
import { normalizeSlug } from '@/lib/country-utils';
import { OFFICIAL_COUNTRY_HERO_PATHS } from '@/lib/official-country-assets';
import { getPublicRecordImage } from '@/lib/record-image';
import { resolvePublicCmsImage, resolvePublicHeroCarouselImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

export function resolveCountrySlug(slug?: string | null, record?: RecordRow | null) {
  const fromRecord = record ? String(record.slug || record.name || record.title || '') : '';
  return countrySlugFromLanding(slug || fromRecord) || normalizeSlug(slug || fromRecord);
}

export const COUNTRY_HERO_IMAGES = OFFICIAL_COUNTRY_HERO_PATHS;

/** Public cards: no stock fallback — use empty UI when CMS has no upload. */
export const DEFAULT_COUNTRY_HERO = '';

/**
 * Country hero: admin upload first, then bundled `/heroes/*`, then verified Unsplash fallback.
 * Use {@link resolvePublicHeroCarouselImage} in hero components (see ResponsiveImage).
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null): string | null {
  const resolvedSlug = resolveCountrySlug(slug, record);

  if (record) {
    const fromCms = getPublicRecordImage(record);
    if (fromCms) {
      const cmsUrl = resolvePublicCmsImage(fromCms);
      if (cmsUrl) return cmsUrl;
    }
  }

  const bundled = resolvedSlug ? OFFICIAL_COUNTRY_HERO_PATHS[resolvedSlug] : '';
  if (bundled) {
    const hero = resolvePublicHeroCarouselImage(bundled);
    if (hero) return hero;
  }

  const remote = countryHeroRemoteFallback(resolvedSlug || slug);
  return resolvePublicHeroCarouselImage(remote) || remote;
}
