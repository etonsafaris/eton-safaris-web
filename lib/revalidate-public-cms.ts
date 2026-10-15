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
  if (table === 'gallery') return '/gallery';
  if (table === 'countries' && slug) return `/destinations/${slug}`;
  return null;
}

function pagePaths(slug: string): string[] {
  const key = slug.toLowerCase();
  const paths = new Set<string>();
  const main = pagePublicPath(slug);
  if (main) paths.add(main);
  if (!key || key === 'home' || key === 'homepage' || key === 'home-page') paths.add('/');
  if (key.includes('community')) {
    paths.add('/community');
    paths.add('/community-support');
  }
  if (key.includes('contact')) paths.add('/contact-us');
  if (key.includes('about')) paths.add('/about-us');
  if (key.includes('terms')) paths.add('/terms-of-services');
  if (key.includes('privacy')) paths.add('/privacy-policies');
  if (key.includes('agency')) paths.add('/tours-and-travel-agency');
  return [...paths];
}

/** Drop the public CMS cache so admin edits show on the live site. */
export function revalidatePublicCms(table: string, payload?: Record<string, unknown> | null) {
  try {
    revalidateTag(CMS_PUBLIC_CACHE_TAG);
    revalidatePath('/', 'layout');
    const slug = String(payload?.slug || payload?.seo_slug || '')
      .trim()
      .replace(/^\/+|\/+$/g, '');
    const paths =
      table === 'pages' && slug
        ? pagePaths(slug)
        : [publicPathForSavedRow(table, payload)].filter((path): path is string => Boolean(path));
    for (const path of paths) revalidatePath(path);
  } catch (error) {
    console.warn('[CMS] Public cache refresh failed:', error);
  }
}
