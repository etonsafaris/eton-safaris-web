import { canonicalCountrySlug } from '@/lib/country-utils';

const HERO_UNSPLASH_PARAMS = 'auto=format&fit=crop&w=1920&q=85';

/** Reliable HTTPS hero art when `public/heroes/*` files are not deployed. */
const COUNTRY_HERO_REMOTE: Record<string, string> = {
  uganda: `https://images.unsplash.com/photo-1523805009345-744884127a0?${HERO_UNSPLASH_PARAMS}`,
  kenya: `https://images.unsplash.com/photo-1516426122078-c23e9931aeeb?${HERO_UNSPLASH_PARAMS}`,
  tanzania: `https://images.unsplash.com/photo-1516026672272-bc52d61a55d9?${HERO_UNSPLASH_PARAMS}`,
  rwanda: `https://images.unsplash.com/photo-1551969014-7d9720413452?${HERO_UNSPLASH_PARAMS}`,
  botswana: `https://images.unsplash.com/photo-1509316975850-ff9c5deb6cd8?${HERO_UNSPLASH_PARAMS}`,
  egypt: `https://images.unsplash.com/photo-1564760055775-d63b17a55c44?${HERO_UNSPLASH_PARAMS}`,
  namibia: `https://images.unsplash.com/photo-1509316785289-025f5b846b8f?${HERO_UNSPLASH_PARAMS}`,
  'south-africa': `https://images.unsplash.com/photo-1516426122078-c23e9931aeeb?${HERO_UNSPLASH_PARAMS}`,
  'dr-congo': `https://images.unsplash.com/photo-1547471080-7cc2caa45a84?${HERO_UNSPLASH_PARAMS}`,
  ethiopia: `https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?${HERO_UNSPLASH_PARAMS}`,
  malawi: `https://images.unsplash.com/photo-1549363331-4fa7cdb8f802?${HERO_UNSPLASH_PARAMS}`,
  zambia: `https://images.unsplash.com/photo-1549363331-4fa7cdb8f802?${HERO_UNSPLASH_PARAMS}`,
};

export function countryHeroRemoteFallback(slug: string | null | undefined): string {
  const key = canonicalCountrySlug(String(slug || '')) || 'kenya';
  return COUNTRY_HERO_REMOTE[key] || COUNTRY_HERO_REMOTE.kenya;
}
