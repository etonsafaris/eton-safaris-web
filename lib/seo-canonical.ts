import { SITE } from '@/lib/collections';

/** Normalize a public path: no query/hash, single slashes, no trailing slash (except root). */
export function normalizePublicPath(path: string): string {
  let value = String(path || '').trim();
  if (!value) return '/';
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return '/';
    }
  }
  value = value.split('?')[0].split('#')[0];
  value = value.replace(/\/+/g, '/');
  if (!value.startsWith('/')) value = `/${value}`;
  if (value.length > 1) value = value.replace(/\/+$/, '');
  return value || '/';
}

/** Absolute self-referencing canonical URL for etonsafaris.com. */
export function publicCanonicalUrl(path: string): string {
  const normalized = normalizePublicPath(path);
  const origin = SITE.url.replace(/\/+$/, '');
  return normalized === '/' ? origin : `${origin}${normalized}`;
}
