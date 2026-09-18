import { canonicalCountrySlug } from '@/lib/country-utils';

function bareCountrySlug(countrySlug: string) {
  return (
    canonicalCountrySlug(countrySlug) ||
    String(countrySlug || '')
      .trim()
      .replace(/-safaris$/i, '')
  );
}

export function countryParksListingPath(countrySlug: string) {
  const bare = bareCountrySlug(countrySlug);
  return bare ? `/parks?country=${encodeURIComponent(bare)}` : '/parks';
}

export function countryExploreListingPath(countrySlug: string) {
  const bare = bareCountrySlug(countrySlug);
  return bare ? `/explore?country=${encodeURIComponent(bare)}` : '/explore';
}

export function countryAccommodationsListingPath(countrySlug: string) {
  const bare = bareCountrySlug(countrySlug);
  return bare ? `/accommodations?country=${encodeURIComponent(bare)}` : '/accommodations';
}
