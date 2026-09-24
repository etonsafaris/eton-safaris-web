import { SITE } from '@/lib/collections';

function normalizeHost(hostname: string) {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

function siteHosts(options?: { siteOrigin?: string }) {
  const siteOrigin = options?.siteOrigin || new URL(SITE.url).origin;
  const hosts = new Set<string>();
  try {
    hosts.add(normalizeHost(new URL(siteOrigin).hostname));
  } catch {
    /* ignore */
  }
  hosts.add('etonsafaris.com');
  return hosts;
}

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
  const allowedHosts = siteHosts(options);

  try {
    const url = new URL(raw, pageOrigin || siteOrigin);
    const host = normalizeHost(url.hostname);
    if (!allowedHosts.has(host)) {
      if (pageOrigin) {
        const pageHost = normalizeHost(new URL(pageOrigin).hostname);
        if (host !== pageHost) return null;
      } else {
        return null;
      }
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
