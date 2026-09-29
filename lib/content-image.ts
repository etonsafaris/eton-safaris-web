import { publicCountrySlug, canonicalCountrySlug } from '@/lib/country-utils';
import {
  isAdminPanelImageUrl,
  isStoredCmsMediaPath,
  isSupabaseStorageUrl,
  normalizeStoredMediaPath,
  resolvePublicCmsImage,
  resolvePublicRecordImageSrc,
} from '@/lib/public-image';
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

function recordCountrySlug(record: RecordRow): string {
  return publicCountrySlug(record) || canonicalCountrySlug(pickString(record, ['country', 'slug', 'name']));
}

function isGenericStockUnsplashUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /images\.unsplash\.com/i.test(String(value));
}

function isBrokenCategoryImageUrl(value: unknown): boolean {
  if (value == null) return true;
  const text = String(value).trim();
  if (!text || /^(null|undefined|none|-)$/i.test(text)) return true;
  if (/^\/(?:api\/media|cms-media)\/[a-f0-9]{32}/i.test(text.split('?')[0])) return false;
  if (/images\.unsplash\.com/i.test(text)) return true;
  if (text.startsWith('/heroes/')) return true;
  if (/^\/(media|uploads)\//i.test(text)) return true;
  return false;
}

/** Tour packages only — CMS category rows also carry a `category` label and must not be treated as tours. */
function isTourLikeRecord(record: RecordRow): boolean {
  if (pickNumber(record, ['duration_days', 'days', 'duration']) > 0) return true;
  if (pickNumber(record, ['duration_nights']) > 0) return true;
  if (pickString(record, ['duration_label'])) return true;
  return false;
}

/** Strip legacy / dead URLs before they reach public UI. */
export function sanitizeContentImageUrl(
  src: string | null | undefined,
  record?: RecordRow | null
): string | null {
  void record;
  if (!src || typeof src !== 'string') return null;
  const trimmed = normalizeStoredMediaPath(src.trim());
  if (!trimmed || isBrokenCategoryImageUrl(trimmed)) return null;
  if (isGenericStockUnsplashUrl(trimmed)) return null;
  return resolvePublicRecordImageSrc(trimmed) || resolvePublicCmsImage(trimmed);
}

/** Public site never injects stock — only explicit CMS fields. */
export function fallbackContentImageForRecord(_record: RecordRow | null | undefined): string | null {
  return null;
}

const IMAGE_FIELD_KEYS = [
  'image_url',
  'image',
  'cover_image',
  'featured_image',
  'thumbnail',
  'photo',
  'banner',
  'picture',
  'social_image_url',
] as const;

/** Any `/api/media/{id}` on the row (any image column), normalized for public `src`. */
export function pickAivenMediaFromRecord(record: RecordRow | null | undefined): string | null {
  if (!record || typeof record !== 'object') return null;
  for (const key of IMAGE_FIELD_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const normalized = normalizeStoredMediaPath(value.trim());
    const resolved = resolvePublicRecordImageSrc(normalized);
    if (resolved) return resolved;
  }
  return null;
}

/** True when any CMS image column resolves to a public `src`. */
export function hasPublicTourImage(record: RecordRow | null | undefined): boolean {
  return Boolean(getPublicRecordImage(record));
}

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
  if (isSupabaseStorageUrl(normalized)) {
    return resolvePublicRecordImageSrc(normalized);
  }
  if (isGenericStockUnsplashUrl(normalized) && options?.skipGenericStockUnsplash) {
    return null;
  }
  if (isGenericStockUnsplashUrl(normalized)) return null;
  const clean = sanitizeContentImageUrl(normalized, record);
  if (clean) return clean;
  if (isAdminPanelImageUrl(normalized)) {
    return resolvePublicCmsImage(normalized);
  }
  return null;
}

/** Tour listing/detail cards: CMS uploads only. */
export function resolveTourCardImage(record: RecordRow | null | undefined): string | null {
  if (!record || typeof record !== 'object') return null;

  for (const key of IMAGE_FIELD_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const resolved = resolveImageFieldForRecord(record, value, { skipGenericStockUnsplash: true });
    if (resolved) return resolved;
  }

  return null;
}

/** Public site: admin-stored images only (no stock / Unsplash / bundled heroes). */
export function getPublicRecordImage(record: RecordRow | null | undefined): string | null {
  if (!record || typeof record !== 'object') return null;

  const aivenMedia = pickAivenMediaFromRecord(record);
  if (aivenMedia) return aivenMedia;

  if (isTourLikeRecord(record)) {
    return resolveTourCardImage(record);
  }

  for (const key of IMAGE_FIELD_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const resolved = resolveImageFieldForRecord(record, value);
    if (resolved) return resolved;
  }

  return null;
}

/** @deprecated Prefer getPublicRecordImage (public) or getRecordImageRaw (admin). */
export function getRecordImage(record: RecordRow | null | undefined): string | null {
  return getPublicRecordImage(record);
}
