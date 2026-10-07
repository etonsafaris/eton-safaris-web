import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { OFFICIAL_COUNTRY_HERO_PATHS } from '@/lib/official-country-assets';
import { getPublicRecordImage } from '@/lib/record-image';
import { resolvePublicCmsImage } from '@/lib/public-image';
import { getRecordTitle, pickString } from '@/lib/data';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import type { RecordRow } from '@/lib/types';

export function resolveCountrySlug(slug?: string | null, record?: RecordRow | null) {
  const fromRecord = record ? String(record.slug || record.name || record.title || '') : '';
  return countrySlugFromLanding(slug || fromRecord) || normalizeSlug(slug || fromRecord);
}

export const COUNTRY_HERO_IMAGES = OFFICIAL_COUNTRY_HERO_PATHS;

/** Public cards: no stock fallback — use empty UI when CMS has no upload. */
export const DEFAULT_COUNTRY_HERO = '';

/**
 * Destination / country page hero image — admin country row only (no Unsplash or bundled stock).
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null): string | null {
  void slug;
  if (!record) return null;
  const fromCms = getPublicRecordImage(record);
  return fromCms ? resolvePublicCmsImage(fromCms) : null;
}

/** Hero H1 on public country pages — CMS fields only (no marketing template titles). */
export function countryPageHeroTitle(
  slug: string,
  country: RecordRow | null | undefined,
  override?: string | null
): string {
  const trimmed = String(override || '').trim();
  if (trimmed) return trimmed;

  const extras = parseCmsPageExtras(country, slug);
  const fromExtras = extras.hero_title?.trim();
  if (fromExtras) return fromExtras;

  const fromRow =
    pickString(country || {}, ['tagline', 'headline', 'description_title', 'seo_title']) ||
    getRecordTitle(country || { name: slug });
  return fromRow.trim() || slug.replace(/-/g, ' ');
}
