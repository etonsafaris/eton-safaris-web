import {
  DEFAULT_CATEGORY_CARD_IMAGE,
  isBrokenCategoryImageUrl,
  isGenericStockUnsplashUrl,
  stockImageForCountryCategory,
} from '@/lib/category-display-image';
import { publicCountrySlug, canonicalCountrySlug } from '@/lib/country-utils';
import { officialCountryHeroPath } from '@/lib/official-country-assets';
import { isLiveCmsImage, isStoredCmsMediaPath, normalizeStoredMediaPath, resolvePublicImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

function pickString(record: RecordRow, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function pickNumber(record: RecordRow, keys: string[]): number {
  for (const key of keys) {
    const raw = record[key];
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function getRecordTitle(record: RecordRow): string {
  return pickString(record, ['title', 'name', 'post_title', 'label', 'headline']) || 'Safari';
}

function pathOnly(src: string) {
  const trimmed = src.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed.split('?')[0];
  try {
    return new URL(trimmed).pathname.split('?')[0];
  } catch {
    return trimmed.split('?')[0];
  }
}

function recordCountrySlug(record: RecordRow): string {
  return publicCountrySlug(record) || canonicalCountrySlug(pickString(record, ['country', 'slug', 'name']));
}

/** Tour packages only — CMS category rows also carry a `category` label and must not be treated as tours. */
function isTourLikeRecord(record: RecordRow): boolean {
  if (pickNumber(record, ['duration_days', 'days', 'duration']) > 0) return true;
  if (pickNumber(record, ['duration_nights']) > 0) return true;
  if (pickString(record, ['duration_label'])) return true;
  return false;
}

function officialHeroForRecord(record: RecordRow): string | null {
  const slug = recordCountrySlug(record);
  if (!slug) return null;
  return officialCountryHeroPath(slug);
}

/** Strip legacy / dead URLs before they reach public UI. */
export function sanitizeContentImageUrl(
  src: string | null | undefined,
  record?: RecordRow | null
): string | null {
  if (!src || typeof src !== 'string') return null;
  const trimmed = normalizeStoredMediaPath(src.trim());
  if (!trimmed || isBrokenCategoryImageUrl(trimmed)) return null;

  const deployed = resolvePublicImage(trimmed);
  if (!deployed || isBrokenCategoryImageUrl(deployed)) return null;

  const pathname = pathOnly(deployed);
  if (pathname.startsWith('/heroes/')) {
    if (record && isTourLikeRecord(record)) {
      return null;
    }
    const slug = record ? recordCountrySlug(record) : '';
    if (/\/heroes\/community/i.test(pathname) || /\/heroes\/talk-to-us/i.test(pathname)) {
      return slug ? officialCountryHeroPath(slug) : null;
    }
    if (slug) {
      const official = pathOnly(officialCountryHeroPath(slug));
      if (pathname !== official) {
        return officialCountryHeroPath(slug);
      }
    }
  }

  return deployed;
}

export function fallbackContentImageForRecord(record: RecordRow | null | undefined): string {
  if (!record) return DEFAULT_CATEGORY_CARD_IMAGE;
  const hero = officialHeroForRecord(record);
  if (hero && !isTourLikeRecord(record)) return hero;
  const country = pickString(record, ['country', 'country_name']);
  const title = getRecordTitle(record);
  return stockImageForCountryCategory(country || recordCountrySlug(record), title);
}

const IMAGE_FIELD_KEYS = [
  'image_url',
  'cover_image',
  'featured_image',
  'thumbnail',
  'photo',
  'banner',
  'picture',
  'social_image_url',
] as const;

/** Raw CMS value — use in Admin so uploads and `/api/media/` URLs display as stored. */
export function getRecordImageRaw(record: RecordRow | null | undefined): string | null {
  if (!record || typeof record !== 'object') return null;
  for (const key of IMAGE_FIELD_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function resolveImageFieldForRecord(
  record: RecordRow,
  value: string,
  options?: { skipGenericStockUnsplash?: boolean }
): string | null {
  const normalized = normalizeStoredMediaPath(value.trim());
  if (isGenericStockUnsplashUrl(normalized) && options?.skipGenericStockUnsplash) {
    return null;
  }
  const clean = sanitizeContentImageUrl(normalized, record);
  if (clean) return clean;
  if (isLiveCmsImage(normalized) || isStoredCmsMediaPath(normalized)) {
    return resolvePublicImage(normalized) || null;
  }
  if (!options?.skipGenericStockUnsplash && /images\.unsplash\.com/i.test(normalized)) {
    const deployed = resolvePublicImage(normalized);
    if (deployed && !isBrokenCategoryImageUrl(deployed)) return deployed;
  }
  return null;
}

/** Tour listing/detail cards: CMS uploads only — never inject giraffe / category stock art. */
export function resolveTourCardImage(record: RecordRow | null | undefined): string | null {
  if (!record || typeof record !== 'object') return null;

  for (const key of IMAGE_FIELD_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const resolved = resolveImageFieldForRecord(record, value, { skipGenericStockUnsplash: true });
    if (resolved) return resolved;
  }

  for (const key of IMAGE_FIELD_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    if (isGenericStockUnsplashUrl(normalizeStoredMediaPath(value.trim()))) continue;
    const resolved = resolveImageFieldForRecord(record, value);
    if (resolved) return resolved;
  }

  return null;
}

/** Public site: sanitized URL with safari / official hero fallback (never the brand logo). */
export function getPublicRecordImage(record: RecordRow | null | undefined): string | null {
  if (!record || typeof record !== 'object') return null;

  if (isTourLikeRecord(record)) {
    return resolveTourCardImage(record);
  }

  for (const key of IMAGE_FIELD_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const resolved = resolveImageFieldForRecord(record, value);
    if (resolved) return resolved;
  }

  return fallbackContentImageForRecord(record);
}

/** @deprecated Prefer getPublicRecordImage (public) or getRecordImageRaw (admin). */
export function getRecordImage(record: RecordRow | null | undefined): string | null {
  return getPublicRecordImage(record);
}
