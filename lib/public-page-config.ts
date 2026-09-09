/**
 * Public pages use dynamic rendering to ensure changes appear immediately.
 * This prevents caching issues where deployed changes don't reflect on the live site.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
