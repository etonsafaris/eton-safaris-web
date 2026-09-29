export const DEFAULT_PUBLIC_IMAGE = '/eton-safaris-gorilla.png';

const CMS_MEDIA_ID_RE = /^\/(?:api\/media|cms-media)\/([a-f0-9]{32})(?:\?.*)?$/i;

/** Legacy Supabase Storage — images must be served from Aiven `media_files` via `/api/media/`. */
export function isSupabaseStorageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /supabase\.co\/storage/i.test(value.trim());
}

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
  if (/media\.base44\.com/i.test(src)) return false;
  if (isSupabaseStorageUrl(src)) return false;
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

export function resolvePublicImage(src?: string | null, fallback = '') {
  return resolvePublicCmsImage(src) || fallback;
}

function isVerifiedUnsplashHeroUrl(value: string): boolean {
  if (!/images\.unsplash\.com/i.test(value)) return false;
  try {
    const pathname = new URL(value).pathname;
    return /\/photo-\d+-[a-f0-9]+/i.test(pathname);
  } catch {
    return /photo-\d+-[a-f0-9]+/i.test(value);
  }
}

/**
 * Home hero carousel only: admin CMS media, bundled `/heroes/*`, or verified Unsplash IDs.
 * Tour/category cards should keep using {@link resolvePublicCmsImage}.
 */
export function resolvePublicHeroCarouselImage(src?: string | null): string | null {
  const cms = resolvePublicCmsImage(src);
  if (cms) return cms;
  if (typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (isBundledHeroAsset(trimmed)) {
    const path = imagePathname(trimmed);
    return path.startsWith('/') ? path : trimmed;
  }
  const https = trimmed.replace(/^http:\/\//i, 'https://');
  if (isVerifiedUnsplashHeroUrl(https)) return https;
  return null;
}

function imagePathname(src: string) {
  if (src.startsWith('/') && !src.startsWith('//')) return src.split('?')[0];
  try {
    return new URL(src).pathname;
  } catch {
    return src.split('?')[0];
  }
}

/** Static safari art shipped under `public/heroes` — safe for the home carousel. */
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
