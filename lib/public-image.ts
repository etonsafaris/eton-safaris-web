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

export function resolvePublicImage(src?: string | null, fallback = DEFAULT_PUBLIC_IMAGE) {
  if (isDeployableImageUrl(src)) {
    return src.replace(/^http:\/\//i, 'https://');
  }
  return fallback;
}
