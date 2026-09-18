/**
 * Public CMS pages: ISR + CDN caching (see next.config.js and cms-public-cache).
 * Loaders use unstable_cache tagged cms-public; admin saves call revalidateTag.
 */
export const revalidate = 900;
export const fetchCache = 'auto';
