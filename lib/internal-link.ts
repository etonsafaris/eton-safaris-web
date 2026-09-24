import { SITE } from '@/lib/collections';

/** Same-site path for client navigation, or null for external / special links. */
export function internalPathFromHref(
  href: string,
  options?: { pageOrigin?: string; siteOrigin?: string }
): string | null {
  const raw = href.trim();
  if (!raw) return null;
  if (raw.startsWith('#')) return null;
  if (/^(mailto|tel|javascript|data):/i.test(raw)) return null;

  if (raw.startsWith('/')) {
    return raw;
  }

  const siteOrigin = options?.siteOrigin || new URL(SITE.url).origin;
  const pageOrigin = options?.pageOrigin;

  try {
    const url = new URL(raw, pageOrigin || siteOrigin);
    const allowed = new Set([siteOrigin]);
    if (pageOrigin) allowed.add(pageOrigin);
    if (!allowed.has(url.origin)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
