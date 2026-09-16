/**
 * Render public pages on request so Vercel builds do not prerender the CMS.
 * Edge/CDN caching is set in next.config.js instead of build-time ISR.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
