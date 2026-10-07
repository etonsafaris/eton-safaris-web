/**
 * Parks and stays: indexable detail URLs (sitemap + Google), hidden from browse UX
 * (nav, listings, country carousels, site search). Detail pages promote country tours.
 */
export const PUBLIC_LISTING_PATHS = ['/explore', '/tours', '/safari-updates'] as const;

/** Legacy hub URLs — redirect to tours; omitted from sitemap. */
export const SEO_ONLY_LISTING_HUB_PATHS = ['/parks', '/accommodations'] as const;

const HIDDEN_BROWSE_TABLES = new Set([
  'national_park',
  'national_parks',
  'parks',
  'accommodations',
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
  return false;
}

export function showStaysOnParkPages(): boolean {
  return false;
}
