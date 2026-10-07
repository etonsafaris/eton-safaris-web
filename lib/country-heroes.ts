import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { OFFICIAL_COUNTRY_HERO_PATHS } from '@/lib/official-country-assets';
import { getRecordTitle, pickString } from '@/lib/data';
import {
  isStoredCmsMediaPath,
  normalizeStoredMediaPath,
  resolvePublicCmsImage,
} from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

export function resolveCountrySlug(slug?: string | null, record?: RecordRow | null) {
  const fromRecord = record ? String(record.slug || record.name || record.title || '') : '';
  return countrySlugFromLanding(slug || fromRecord) || normalizeSlug(slug || fromRecord);
}

export const COUNTRY_HERO_IMAGES = OFFICIAL_COUNTRY_HERO_PATHS;

/** Public cards: no stock fallback — use empty UI when CMS has no upload. */
export const DEFAULT_COUNTRY_HERO = '';

function resolveFeaturedImageUrl(raw: string): string | null {
  const normalized = normalizeStoredMediaPath(raw.trim());
  if (!normalized) return null;
  const cms = resolvePublicCmsImage(normalized);
  if (cms) return cms;
  if (isStoredCmsMediaPath(normalized)) return normalized;
  return null;
}

/**
 * Admin → public: Featured Image (`image_url` on the country row), same as CountryForm.
 */
export function countryAdminFeaturedImage(record: RecordRow | null | undefined): string | null {
  if (!record) return null;
  const featured = pickString(record, ['image_url']);
  if (featured) {
    const resolved = resolveFeaturedImageUrl(featured);
    if (resolved) return resolved;
  }
  for (const key of ['cover_image', 'featured_image', 'image', 'social_image_url'] as const) {
    const value = pickString(record, [key]);
    if (!value) continue;
    const resolved = resolveFeaturedImageUrl(value);
    if (resolved) return resolved;
  }
  return null;
}

/** Destination page hero background — admin featured image only. */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null): string | null {
  void slug;
  return countryAdminFeaturedImage(record);
}

/**
 * Admin → public: Country Headline (`tagline` / `headline` on the country row).
 * Ignores legacy embedded `hero_title` when tagline is set.
 */
export function countryPageHeroTitle(
  slug: string,
  country: RecordRow | null | undefined,
  override?: string | null
): string {
  const trimmed = String(override || '').trim();
  if (trimmed) return trimmed;

  const adminHeadline = pickString(country || {}, ['tagline', 'headline']);
  if (adminHeadline) return adminHeadline;

  const fromRow =
    pickString(country || {}, ['hero_title', 'description_title', 'seo_title']) ||
    getRecordTitle(country || { name: slug });
  return fromRow.trim() || slug.replace(/-/g, ' ');
}
