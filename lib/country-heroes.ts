import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { OFFICIAL_COUNTRY_HERO_PATHS } from '@/lib/official-country-assets';
import { getPublicRecordImage } from '@/lib/record-image';
import { resolvePublicCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

export function resolveCountrySlug(slug?: string | null, record?: RecordRow | null) {
  const fromRecord = record ? String(record.slug || record.name || record.title || '') : '';
  return countrySlugFromLanding(slug || fromRecord) || normalizeSlug(slug || fromRecord);
}

export const COUNTRY_HERO_IMAGES = OFFICIAL_COUNTRY_HERO_PATHS;

/** Public cards: no stock fallback — use empty UI when CMS has no upload. */
export const DEFAULT_COUNTRY_HERO = '';

/**
 * Country hero + cards: same URL as stored in admin (Aiven media / Cloudinary on the row).
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null): string | null {
  void slug;
  if (!record) return null;
  const fromCms = getPublicRecordImage(record);
  return fromCms ? resolvePublicCmsImage(fromCms) : null;
}
