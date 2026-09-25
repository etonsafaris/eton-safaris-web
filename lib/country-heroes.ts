import { SITE_LOGO } from '@/lib/collections';
import { getRecordImage } from '@/lib/record-image';
import { isBundledHeroAsset, isDeployableImageUrl, isLiveCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

/** Last-resort placeholder only — never substitute another country's art. */
export const DEFAULT_COUNTRY_HERO = SITE_LOGO;

/**
 * Country + home carousel: CMS country cover first, else site logo.
 * (Do not guess `/heroes/{slug}.webp` — those files are not shipped for every country.)
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const fromCms = record ? getRecordImage(record) : null;
  if (isDeployableImageUrl(fromCms)) {
    if (isLiveCmsImage(fromCms) || isBundledHeroAsset(fromCms)) {
      return fromCms;
    }
  }
  return DEFAULT_COUNTRY_HERO;
}
