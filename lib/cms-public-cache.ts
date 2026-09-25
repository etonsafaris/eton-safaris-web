/** Next.js Data Cache tag for public CMS reads — bust via /api/admin/revalidate */
export const CMS_PUBLIC_CACHE_TAG = 'cms-public';
export const CMS_PUBLIC_REVALIDATE_SECONDS = 900;

/** CDN + browser caching for `/api/public/*` (matches page ISR). */
export const CMS_PUBLIC_HTTP_CACHE_CONTROL = `public, s-maxage=${CMS_PUBLIC_REVALIDATE_SECONDS}, stale-while-revalidate=3600`;
