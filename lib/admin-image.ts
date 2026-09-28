import { getRecordImageRaw } from '@/lib/record-image';
import { normalizeStoredMediaPath } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

/** Local fallback when CMS rows have no image or remote URLs fail in the admin UI. */
export const ADMIN_DEFAULT_CARD_IMAGE = '/images/official-default-safari.jpg';

const BROKEN_ADMIN_PREVIEW_MARKERS = [
  'eton-safaris-gorilla',
  'media.base44.com',
  'supabase.co/storage',
  '/object/authenticated/',
  '/object/sign/',
  'via.placeholder',
];

/** Normalize a stored CMS URL for `<img src>` in Admin (never rewrite to public fallbacks). */
export function adminImageSrcFromUrl(url: string | null | undefined): string | null {
  try {
    if (!url || typeof url !== 'string') return null;
    const trimmed = normalizeStoredMediaPath(url.trim());
    if (!trimmed || trimmed.startsWith('blob:')) return null;
    const lower = trimmed.toLowerCase();
    for (const marker of BROKEN_ADMIN_PREVIEW_MARKERS) {
      if (lower.includes(marker)) return null;
    }
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/^http:\/\//i, 'https://');
    return null;
  } catch {
    return null;
  }
}

/** Never pass an empty/invalid value into card `src` — always returns a usable path or URL. */
export function resolveAdminCardImageSrc(url: string | null | undefined): string {
  return adminImageSrcFromUrl(url) ?? ADMIN_DEFAULT_CARD_IMAGE;
}

/** First raw image field on a row, safe for admin list cards and form previews. */
export function resolveAdminPreviewImage(record: RecordRow | null | undefined): string | null {
  try {
    return adminImageSrcFromUrl(getRecordImageRaw(record));
  } catch {
    return null;
  }
}

/** Filter + map admin table rows without throwing into the error boundary. */
export function safeAdminRecordRows<T extends RecordRow>(rows: T[] | null | undefined): T[] {
  try {
    return (rows ?? []).filter((row) => row != null && typeof row === 'object') as T[];
  } catch {
    return [];
  }
}
