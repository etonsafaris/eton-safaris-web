import { SITE } from '@/lib/collections';
import { publicSiteBaseUrl } from '@/lib/auto-index-seo';

/** Full https URL on the public site (etonsafaris.com), for links opened from admin.etonsafaris.com. */
export function absolutePublicSiteUrl(path: string | null | undefined): string | null {
  if (path == null) return null;
  const trimmed = String(path).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/^http:\/\//i, 'https://');
  const base = publicSiteBaseUrl() || SITE.url.replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}
