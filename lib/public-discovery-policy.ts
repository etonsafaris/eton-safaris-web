/**
 * Language posts, parks, stays, and explore places: detail URLs stay in the sitemap
 * and open when Google sends a visitor. They are not listed, linked, or searched
 * on the public site. Standard safari updates and tours stay public.
 */
export const PUBLIC_LISTING_PATHS = ['/tours', '/safari-updates'] as const;

/** Listing hubs — redirect to tours; omitted from sitemap. Detail URLs stay. */
export const SEO_ONLY_LISTING_HUB_PATHS = ['/parks', '/accommodations', '/explore'] as const;

const HIDDEN_BROWSE_TABLES = new Set([
  'national_park',
  'national_parks',
  'parks',
  'accommodations',
  'explore',
]);

export function isSeoOnlyListingHub(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  return SEO_ONLY_LISTING_HUB_PATHS.some((hub) => path === hub || path.startsWith(`${hub}?`));
}

export function isHiddenBrowseTable(table: string): boolean {
  return HIDDEN_BROWSE_TABLES.has(String(table || '').toLowerCase());
}

export function includeInPublicSiteSearch(table: string): boolean {
  return !isHiddenBrowseTable(table);
}

export function showParksOnCountryPages(): boolean {
  return true;
}

export function showStaysOnParkPages(): boolean {
  return false;
}
