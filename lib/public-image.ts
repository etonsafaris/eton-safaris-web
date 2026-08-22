export const DEFAULT_PUBLIC_IMAGE = '/heroes/kenya.jpg';

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
  if (/\/object\/authenticated\//i.test(src) || /\/object\/sign\//i.test(src)) return false;

  if (src.startsWith('/') && !src.startsWith('//')) {
    if (isKnownPublicAsset(src)) return true;
    if (isLocalUploadPath(src)) return allowLocalOnlyPaths();
    return allowLocalOnlyPaths();
  }

  try {
    const url = new URL(src);
    if (isLocalDevHost(url.hostname)) return false;
    if (isThisSiteHost(url.hostname) && isLocalUploadPath(url.pathname)) {
      return allowLocalOnlyPaths();
    }
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function resolvePublicImage(src?: string | null, fallback = '') {
  if (isDeployableImageUrl(src)) {
    return src.replace(/^http:\/\//i, 'https://');
  }
  return fallback;
}

function imagePathname(src: string) {
  if (src.startsWith('/') && !src.startsWith('//')) return src.split('?')[0];
  try {
    return new URL(src).pathname;
  } catch {
    return src.split('?')[0];
  }
}

/** Admin-uploaded / CMS images that can appear on Vercel. Bundled heroes and Unsplash placeholders are not live CMS. */
export function isLiveCmsImage(value: unknown): value is string {
  if (!isDeployableImageUrl(value)) return false;
  const src = value.trim();
  const pathname = imagePathname(src);
  if (pathname.startsWith('/heroes/')) return false;
  if (/images\.unsplash\.com/i.test(src)) return false;
  return true;
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
