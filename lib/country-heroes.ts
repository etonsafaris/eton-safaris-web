import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { getRecordImage } from '@/lib/record-image';
import { isBundledHeroAsset, isDeployableImageUrl, isLiveCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

/** Bundled safari art shipped under `public/heroes` (restored from repo history). */
const FILES: Record<string, string> = {
  uganda: '/heroes/uganda.jpg',
  kenya: '/heroes/kenya.jpg',
  tanzania: '/heroes/tanzania.jpg',
  rwanda: '/heroes/rwanda.webp',
  botswana: '/heroes/botswana.jpg',
  egypt: '/heroes/egypt.webp',
  namibia: '/heroes/namibia.jpg',
  'south-africa': '/heroes/south-africa.webp',
  'dr-congo': '/heroes/dr-congo.jpg',
  ethiopia: '/heroes/ethiopia.jpg',
  malawi: '/heroes/malawi.webp',
  zambia: '/heroes/zambia.webp',
};

/** Generic safari fallback — never the Eton logo on destination cards. */
export const DEFAULT_COUNTRY_HERO = '/heroes/kenya.jpg';

export const COUNTRY_HERO_IMAGES = FILES;

export function bundledCountryHero(slug?: string | null) {
  const key = countrySlugFromLanding(slug || '') || normalizeSlug(slug || '');
  return FILES[key] || DEFAULT_COUNTRY_HERO;
}

/**
 * Country covers: live CMS upload first, then bundled per-country art.
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const fromCms = record ? getRecordImage(record) : null;
  if (isDeployableImageUrl(fromCms)) {
    if (isLiveCmsImage(fromCms) || isBundledHeroAsset(fromCms)) {
      return fromCms;
    }
  }
  const fromRecord = record ? String(record.slug || record.name || record.title || '') : '';
  return bundledCountryHero(slug || fromRecord);
}
