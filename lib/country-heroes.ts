import { SITE_LOGO } from '@/lib/collections';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { getRecordImage } from '@/lib/data';
import { isBundledHeroAsset, isDeployableImageUrl, isLiveCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

/** Last-resort placeholder only — never substitute another country's art. */
export const DEFAULT_COUNTRY_HERO = SITE_LOGO;

/** Optional per-slug files under `public/heroes/{slug}.webp` when you ship them. */
export function bundledCountryHero(slug?: string | null) {
  const key = countrySlugFromLanding(slug || '') || normalizeSlug(slug || '');
  if (!key) return '';
  return `/heroes/${key}.webp`;
}

/**
 * Country + home carousel: CMS country image first, then slug file if present in `public/heroes`, else logo.
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const fromCms = record ? getRecordImage(record) : null;
  if (isDeployableImageUrl(fromCms)) {
    if (isLiveCmsImage(fromCms) || isBundledHeroAsset(fromCms)) {
      return fromCms;
    }
  }
  const bundled = bundledCountryHero(slug);
  if (bundled && isDeployableImageUrl(bundled)) {
    return bundled;
  }
  return DEFAULT_COUNTRY_HERO;
}
