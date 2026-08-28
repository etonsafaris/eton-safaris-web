/** Public CMS pages always read fresh data — avoids stale HTML on tab refresh. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
