import { SITE } from '@/lib/collections';

/** Reject DB connection strings and other non-website values wrongly set as the public site URL. */
export function sanitizePublicSiteOrigin(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  if (/^postgres(ql)?:\/\//i.test(trimmed)) return null;
  if (/sslmode=require/i.test(trimmed) && trimmed.includes('@')) return null;
  if (/^mysql:\/\//i.test(trimmed)) return null;
  if (/aivencloud\.com/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      if (/^postgres(ql)?$/i.test(url.protocol.replace(':', ''))) return null;
      return `${url.protocol}//${url.host}`;
    } catch {
      return null;
    }
  }

  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(:\d+)?$/i.test(trimmed)) {
    return `https://${trimmed.split(':')[0]}`;
  }

  return null;
}

/** Canonical https origin for public links (admin “View”, SEO canonicals, Read More). */
export function resolvePublicSiteOrigin(): string {
  const fromEnv = sanitizePublicSiteOrigin(
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL : undefined
  );
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const injected = sanitizePublicSiteOrigin(
      (window as unknown as { __ETON_SITE_URL?: string }).__ETON_SITE_URL
    );
    if (injected) return injected;

    const { hostname, protocol } = window.location;
    if (hostname.startsWith('admin.')) {
      const main = sanitizePublicSiteOrigin(`https://${hostname.replace(/^admin\./i, '')}`);
      if (main) return main;
    }
    if (hostname && protocol.startsWith('http')) {
      const self = sanitizePublicSiteOrigin(`${protocol}//${window.location.host}`);
      if (self) return self;
    }
  }

  const vercel =
    typeof process !== 'undefined' && process.env.VERCEL_URL
      ? sanitizePublicSiteOrigin(`https://${process.env.VERCEL_URL}`)
      : null;
  if (vercel) return vercel;

  return SITE.url.replace(/\/+$/, '');
}
