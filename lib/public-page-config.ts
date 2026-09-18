/**
 * Public CMS pages: time-based revalidation and CDN caching (see next.config.js).
 * force-dynamic avoids build-time prerender when DATABASE_URL is missing on CI.
 * Do not use force-no-store — that forces every click to wait on Postgres.
 * Admin saves call /api/admin/revalidate for immediate updates.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 120;
export const fetchCache = 'auto';
