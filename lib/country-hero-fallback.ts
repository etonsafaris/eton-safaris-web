import { canonicalCountrySlug } from '@/lib/country-utils';

const HERO_UNSPLASH_PARAMS = 'auto=format&fit=crop&w=1920&q=85';
const CARD_UNSPLASH_PARAMS = 'auto=format&fit=crop&w=600&q=80';

function unsplashPhoto(photoId: string, params: string): string {
  const id = photoId.startsWith('photo-') ? photoId : `photo-${photoId}`;
  return `https://images.unsplash.com/${id}?${params}`;
}

/**
 * Unsplash IDs verified with HTTP 200 (many legacy safari IDs were removed from Unsplash).
 * @see scripts/verify-unsplash-ids.mjs
 */
export const VERIFIED_UNSPLASH_PHOTOS = {
  safariLandscape: 'photo-1506905925346-21bda4d32df4',
  savannaSunset: 'photo-1470071459604-3b5ec3a7fe05',
  openRoad: 'photo-1469854523086-cc02fe5d8800',
  elephants: 'photo-1559827260-dc66d52bef19',
  pyramids: 'photo-1564760055775-d63b17a55c44',
  riftValley: 'photo-1547471080-7cc2caa01a7e',
  birds: 'photo-1444464666168-49d633b86797',
  mountains: 'photo-1464822759023-fed622ff2c3b',
  wildlifePortrait: 'photo-1518791841217-8f162f1e1131',
  gorilla: 'photo-1578662996442-48f60103fc96',
  lakeSafari: 'photo-1550684848-fac1c5b4e853',
} as const;

/** Reliable HTTPS hero art when `public/heroes/*` files are not deployed. */
const COUNTRY_HERO_REMOTE: Record<string, string> = {
  uganda: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.gorilla, HERO_UNSPLASH_PARAMS),
  kenya: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.elephants, HERO_UNSPLASH_PARAMS),
  tanzania: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.safariLandscape, HERO_UNSPLASH_PARAMS),
  rwanda: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.riftValley, HERO_UNSPLASH_PARAMS),
  botswana: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.openRoad, HERO_UNSPLASH_PARAMS),
  egypt: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.pyramids, HERO_UNSPLASH_PARAMS),
  namibia: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.savannaSunset, HERO_UNSPLASH_PARAMS),
  'south-africa': unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.elephants, HERO_UNSPLASH_PARAMS),
  'dr-congo': unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.wildlifePortrait, HERO_UNSPLASH_PARAMS),
  ethiopia: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.mountains, HERO_UNSPLASH_PARAMS),
  malawi: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.birds, HERO_UNSPLASH_PARAMS),
  zambia: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.lakeSafari, HERO_UNSPLASH_PARAMS),
  madagascar: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.birds, HERO_UNSPLASH_PARAMS),
  morocco: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.mountains, HERO_UNSPLASH_PARAMS),
  mozambique: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.lakeSafari, HERO_UNSPLASH_PARAMS),
  seychelles: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.savannaSunset, HERO_UNSPLASH_PARAMS),
  zimbabwe: unsplashPhoto(VERIFIED_UNSPLASH_PHOTOS.wildlifePortrait, HERO_UNSPLASH_PARAMS),
};

const DEFAULT_COUNTRY_KEY = 'kenya';

export function countryHeroRemoteFallback(slug: string | null | undefined): string {
  const key = canonicalCountrySlug(String(slug || '')) || DEFAULT_COUNTRY_KEY;
  return COUNTRY_HERO_REMOTE[key] || COUNTRY_HERO_REMOTE[DEFAULT_COUNTRY_KEY];
}

/** Smaller stock URLs for cards and category thumbnails. */
export function countryCardRemoteFallback(slug: string | null | undefined): string {
  const key = canonicalCountrySlug(String(slug || '')) || DEFAULT_COUNTRY_KEY;
  const hero = COUNTRY_HERO_REMOTE[key] || COUNTRY_HERO_REMOTE[DEFAULT_COUNTRY_KEY];
  return hero.replace(HERO_UNSPLASH_PARAMS, CARD_UNSPLASH_PARAMS);
}

export function defaultSafariStockImage(): string {
  return countryCardRemoteFallback(DEFAULT_COUNTRY_KEY);
}
