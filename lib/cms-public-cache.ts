/** Next.js Data Cache tag for public CMS reads — bust via /api/admin/revalidate */
export const CMS_PUBLIC_CACHE_TAG = 'cms-public';
export const CMS_PUBLIC_REVALIDATE_SECONDS = 900;

/** Public detail routes (tour, destination, stay) — tighter sync with admin edits/deletes. */
export const PUBLIC_DETAIL_REVALIDATE_SECONDS = 60;

/** CDN + browser caching for `/api/public/*` (matches page ISR). */
export const CMS_PUBLIC_HTTP_CACHE_CONTROL = `public, s-maxage=${CMS_PUBLIC_REVALIDATE_SECONDS}, stale-while-revalidate=3600`;
