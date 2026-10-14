import { isBase44MediaUrl, isLegacyExternalMediaUrl, isSupabaseStorageUrl } from '@/lib/legacy-media-url';

export { isSupabaseStorageUrl } from '@/lib/legacy-media-url';

export const DEFAULT_PUBLIC_IMAGE = '/eton-safaris-gorilla.png';
/** Official bundled card placeholder (`public/images/official-default-safari.jpg`). */
export const OFFICIAL_DEFAULT_CARD_IMAGE = '/images/official-default-safari.jpg';
/** Bundled safari placeholder for public cards and search matrices. */
export const DEFAULT_SAFARI_FALLBACK_IMAGE = OFFICIAL_DEFAULT_CARD_IMAGE;

const CMS_MEDIA_ID_RE = /^\/(?:api\/media|cms-media)\/([a-f0-9]{32})(?:\?.*)?$/i;

/** Uploaded files saved as `/api/media/{id}` or the `/cms-media/{id}` rewrite alias. */
export function isStoredCmsMediaPath(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const path = value.trim().split('?')[0];
  return CMS_MEDIA_ID_RE.test(path);
}

/** Map legacy `/cms-media/{id}` paths to the canonical API route. */
export function normalizeStoredMediaPath(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return trimmed;
  const direct = trimmed.split('?')[0].match(CMS_MEDIA_ID_RE);
  if (direct) return `/api/media/${direct[1]}`;
  try {
    const url = new URL(trimmed, 'https://etonsafaris.com');
    const fromPath = url.pathname.match(CMS_MEDIA_ID_RE);
    if (fromPath) return `/api/media/${fromPath[1]}`;
  } catch {
    /* relative or invalid URL */
  }
  return trimmed;
}

function isLocalDevHost(hostname: string) {
  return /^(localhost|127\.0\.0\.1)$/i.test(hostname);
}

function allowLocalOnlyPaths() {
  if (typeof window !== 'undefined') {
    return isLocalDevHost(window.location.hostname);
  }
  return !process.env.VERCEL && process.env.NODE_ENV !== 'production';
}

function isKnownPublicAsset(pathname: string) {
  return (
    pathname === '/eton-safaris-gorilla.png' ||
    pathname.startsWith('/heroes/') ||
    pathname.startsWith('/flags/') ||
    pathname.startsWith('/eton-safaris')
  );
}

function isLocalUploadPath(pathname: string) {
  return /^\/(media|uploads)\//i.test(pathname);
}

function isThisSiteHost(hostname: string) {
  return /(^|\.)etonsafaris\.com$/i.test(hostname) || /(^|\.)vercel\.app$/i.test(hostname);
}

/** Local /media uploads and localhost URLs exist only on the machine that saved them. They 404 on Vercel. */
export function isDeployableImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const src = value.trim();
  if (!src || src === 'null' || src === 'undefined') return false;
  if (src.startsWith('{') || src.startsWith('[')) return false;
  if (/^(blob:|data:)/i.test(src)) return false;
  if (isLegacyExternalMediaUrl(src)) return false;
  if (/\/object\/authenticated\//i.test(src) || /\/object\/sign\//i.test(src)) return false;

  const normalized = normalizeStoredMediaPath(src);
  if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    if (isKnownPublicAsset(normalized) || isStoredCmsMediaPath(normalized)) return true;
    if (isLocalUploadPath(src)) return allowLocalOnlyPaths();
    return allowLocalOnlyPaths();
  }

  try {
    const url = new URL(src);
    if (/supabase\.co$/i.test(url.hostname)) return false;
    if (isLocalDevHost(url.hostname)) return false;
    if (isThisSiteHost(url.hostname) && isLocalUploadPath(url.pathname)) {
      return allowLocalOnlyPaths();
    }
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isStockOrBundledPath(pathname: string): boolean {
  return (
    pathname.startsWith('/heroes/') ||
    /images\.unsplash\.com/i.test(pathname) ||
    pathname === '/eton-safaris-gorilla.png'
  );
}

/**
 * Public site: only admin-module media (Aiven `/api/media/{id}` or Cloudinary URLs saved on CMS rows).
 * No Unsplash, bundled `/heroes`, or other stock art.
 */
export function isAdminPanelImageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || isSupabaseStorageUrl(trimmed)) return false;
  if (/images\.unsplash\.com/i.test(trimmed)) return false;

  const normalized = normalizeStoredMediaPath(trimmed);
  const pathname = imagePathname(normalized);
  if (isStockOrBundledPath(pathname)) return false;

  if (isStoredCmsMediaPath(normalized) || pathname.startsWith('/api/media/')) return true;
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(normalized)) return true;

  try {
    const url = new URL(normalized);
    if (isThisSiteHost(url.hostname) && CMS_MEDIA_ID_RE.test(url.pathname)) return true;
  } catch {
    /* relative */
  }

  return false;
}

/** Resolve a CMS row image for the public site, or null when not admin-uploaded. */
export function resolvePublicCmsImage(src?: string | null): string | null {
  if (!isAdminPanelImageUrl(src)) return null;
  const normalized = normalizeStoredMediaPath(String(src).trim());
  return normalized.replace(/^http:\/\//i, 'https://');
}

/**
 * Tour/card images assigned in admin: `/api/media`, Cloudinary, same-site media URLs,
 * or Cloudinary URLs saved on CMS rows (never Base44 / Supabase Storage).
 */
export function resolvePublicRecordImageSrc(src?: string | null): string | null {
  const cms = resolvePublicCmsImage(src);
  if (cms) return cms;
  if (typeof src !== 'string') return null;
  const raw = src.trim();
  if (!raw || raw.startsWith('{') || raw.startsWith('[')) return null;
  if (isLegacyExternalMediaUrl(raw) || isBase44MediaUrl(raw)) return null;
  if (/images\.unsplash\.com/i.test(raw) || raw.startsWith('/heroes/')) return null;

  const normalized = normalizeStoredMediaPath(raw);
  const https = normalized.replace(/^http:\/\//i, 'https://');

  if (/^https:\/\/res\.cloudinary\.com\//i.test(https)) return https;

  if (isStoredCmsMediaPath(normalized)) {
    return resolvePublicCmsImage(normalized);
  }

  try {
    const url = new URL(https);
    if (isThisSiteHost(url.hostname) && CMS_MEDIA_ID_RE.test(url.pathname)) {
      const id = url.pathname.match(CMS_MEDIA_ID_RE)?.[1];
      if (id) return `/api/media/${id}`;
    }
  } catch {
    /* relative */
  }

  return null;
}

export function resolvePublicImage(src?: string | null, fallback = '') {
  return resolvePublicCmsImage(src) || fallback;
}

/**
 * Hero frames: the image saved for that page in admin.
 * Unsplash, bundled `/heroes`, and the generic safari photo are not page heroes.
 */
export function resolvePublicHeroCarouselImage(src?: string | null): string | null {
  return resolvePublicCmsImage(src);
}

function imagePathname(src: string) {
  if (src.startsWith('/') && !src.startsWith('//')) return src.split('?')[0];
  try {
    return new URL(src).pathname;
  } catch {
    return src.split('?')[0];
  }
}

/** Static safari art shipped under `public/heroes`. Not used for public heroes. */
export function isBundledHeroAsset(value: unknown): value is string {
  if (!isDeployableImageUrl(value)) return false;
  const pathname = imagePathname(value.trim());
  return pathname.startsWith('/heroes/');
}

/** Same rule as {@link isAdminPanelImageUrl} — used when picking hero/cover fields. */
export function isLiveCmsImage(value: unknown): value is string {
  return isAdminPanelImageUrl(value);
}

export function withImageCacheBust(src: string, stamp?: string | null) {
  const token = String(stamp || '')
    .trim()
    .replace(/[^\w.:-]/g, '')
    .slice(0, 48);
  if (!token || src.startsWith('/')) return src;
  try {
    const url = new URL(src);
    url.searchParams.set('v', token);
    return url.toString();
  } catch {
    return src;
  }
}

export function isLocalOnlyImage(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const src = value.trim();
  if (/^(blob:|data:)/i.test(src)) return true;
  if (/^\/(media|uploads)\//i.test(src)) return true;
  try {
    const url = new URL(src);
    return /^(localhost|127\.0\.0\.1)$/i.test(url.hostname);
  } catch {
    return false;
  }
}

/** Public cards: only admin/CMS image URLs — no bundled placeholder before the real src loads. */
export function publicImageSrcOrFallback(src?: string | null): string {
  const trimmed = typeof src === 'string' ? src.trim() : '';
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
  return resolvePublicRecordImageSrc(trimmed) || '';
}

/** Card/search matrix image — same as {@link publicImageSrcOrFallback} (strict). */
export function publicCardImageSrc(src?: string | null): string {
  return publicImageSrcOrFallback(src);
}

/** Optional bundled art only after a failed load (see ResponsiveImage onError). */
export function publicImagePlaceholderArt(): string {
  return OFFICIAL_DEFAULT_CARD_IMAGE;
}
