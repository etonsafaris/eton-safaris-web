import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { getRecordImage } from '@/lib/data';
import { isBundledHeroAsset, isDeployableImageUrl, isLiveCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

/** Only paths that exist under `public/heroes` (no phantom .jpg stubs). */
const BUNDLED_HERO_FILES: Record<string, string> = {
  rwanda: '/heroes/rwanda.webp',
  egypt: '/heroes/egypt.webp',
  malawi: '/heroes/malawi.webp',
  zambia: '/heroes/zambia.webp',
  'south-africa': '/heroes/south-africa.webp',
};

export const DEFAULT_COUNTRY_HERO = '/heroes/zambia.webp';

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
