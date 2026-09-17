/**
 * Public pages always render on request so Vercel builds without DATABASE_URL
 * do not prerender empty CMS HTML. List queries are light and CDN-cached in
 * next.config.js (s-maxage=60). Do not force-no-store — that made every click
 * wait on Postgres.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 60;
export const fetchCache = 'auto';
