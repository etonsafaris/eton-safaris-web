import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { getRecordImage } from '@/lib/data';
import { isBundledHeroAsset, isDeployableImageUrl, isLiveCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

/** Only paths that exist under `public/heroes` (no phantom .jpg stubs). */
/** Paths must exist under `public/heroes` in git (see `git ls-files public/heroes`). */
const BUNDLED_HERO_FILES: Record<string, string> = {
  uganda: '/heroes/egypt-1440.webp',
  kenya: '/heroes/south-africa.avif',
  tanzania: '/heroes/community-tourism-1440.webp',
  rwanda: '/heroes/community-conservation-1440.webp',
  egypt: '/heroes/egypt-1440.webp',
  malawi: '/heroes/community-employment-1440.webp',
  zambia: '/heroes/egypt-1440.webp',
  'south-africa': '/heroes/south-africa.avif',
};

/** Home carousel only — always fast local art (never wait on CMS/CDN for LCP). */
export function homeCarouselHeroImage(slug?: string | null) {
  const key = countrySlugFromLanding(slug || '') || normalizeSlug(slug || '');
  return bundledCountryHero(key) || DEFAULT_COUNTRY_HERO;
}

export const DEFAULT_COUNTRY_HERO = '/heroes/egypt-1440.webp';

export const COUNTRY_HERO_IMAGES = BUNDLED_HERO_FILES;

export function bundledCountryHero(slug?: string | null) {
  const key = countrySlugFromLanding(slug || '') || normalizeSlug(slug || '');
  return BUNDLED_HERO_FILES[key] || '';
}

/**
 * Country cover for cards and home hero: real CMS image when deployable, else bundled file if we ship one.
 * Never returns empty string for a known slug (uses DEFAULT_COUNTRY_HERO last).
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const fromCms = record ? getRecordImage(record) : null;
  if (isDeployableImageUrl(fromCms)) {
    if (isLiveCmsImage(fromCms) || isBundledHeroAsset(fromCms)) {
      return fromCms;
    }
  }
  const bundled = bundledCountryHero(slug);
  if (bundled) return bundled;
  return DEFAULT_COUNTRY_HERO;
}
