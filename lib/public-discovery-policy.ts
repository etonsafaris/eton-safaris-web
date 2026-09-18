/** Indexable detail URLs stay in sitemap; these browse/listing hubs are search-only (davsafaris-style). */
export const DISCOVERY_LISTING_PATHS = ['/parks', '/accommodations', '/explore'] as const;

export function isDiscoveryListingPath(pathname: string) {
  return DISCOVERY_LISTING_PATHS.includes(pathname as (typeof DISCOVERY_LISTING_PATHS)[number]);
}
