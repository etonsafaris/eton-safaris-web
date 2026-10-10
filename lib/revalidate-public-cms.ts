import { revalidatePath, revalidateTag } from 'next/cache';
import { CMS_PUBLIC_CACHE_TAG } from '@/lib/cms-public-cache';
import { pagePublicPath } from '@/lib/cms-routes';

function publicPathForSavedRow(table: string, payload?: Record<string, unknown> | null): string | null {
  const slug = String(payload?.slug || payload?.seo_slug || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (table === 'pages') {
    const key = slug.toLowerCase();
    if (!key || key === 'home' || key === 'homepage' || key === 'home-page') return '/';
    return pagePublicPath(slug);
  }
  if (table === 'safari_updates' && slug) {
    const kind = String(payload?.post_type || payload?.type || '').toLowerCase();
    return kind.includes('language') ? `/safari-updates/languages/${slug}` : `/safari-updates/${slug}`;
  }
  if (table === 'tours' && slug) return `/tours/${slug}`;
  if ((table === 'national_park' || table === 'parks') && slug) return `/parks/${slug}`;
  if (table === 'accommodations' && slug) return `/accommodations/${slug}`;
  if (table === 'explore' && slug) return `/explore/${slug}`;
  if (table === 'countries' && slug) return `/destinations/${slug}`;
  return null;
}

/** Drop the public CMS cache so admin edits show on the live site. */
export function revalidatePublicCms(table: string, payload?: Record<string, unknown> | null) {
  try {
    revalidateTag(CMS_PUBLIC_CACHE_TAG);
    revalidatePath('/', 'layout');
    const path = publicPathForSavedRow(table, payload);
    if (path) revalidatePath(path);
  } catch (error) {
    console.warn('[CMS] Public cache refresh failed:', error);
  }
}
