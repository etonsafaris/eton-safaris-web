import { countryHeroRemoteFallback } from '@/lib/country-hero-fallback';

/**
 * Legacy bundled paths under `public/heroes` (optional on disk).
 * Runtime URLs use {@link officialCountryHeroPath} → verified HTTPS fallbacks when files are absent.
 */
export const OFFICIAL_COUNTRY_HERO_PATHS: Record<string, string> = {
  uganda: '/heroes/uganda.jpg',
  kenya: '/heroes/kenya.jpg',
  tanzania: '/heroes/tanzania.jpg',
  rwanda: '/heroes/rwanda.webp',
  botswana: '/heroes/botswana.jpg',
  egypt: '/heroes/egypt.webp',
  namibia: '/heroes/namibia.jpg',
  'south-africa': '/heroes/south-africa.webp',
  'dr-congo': '/heroes/dr-congo.jpg',
  ethiopia: '/heroes/ethiopia.jpg',
  malawi: '/heroes/malawi.webp',
  zambia: '/heroes/zambia.webp',
};

export const OFFICIAL_COUNTRY_HERO_FILE_SET = new Set(Object.values(OFFICIAL_COUNTRY_HERO_PATHS));

/** Community / marketing heroes (not country covers). */
export const OFFICIAL_COMMUNITY_HERO_PATHS = [
  '/heroes/community-hero-768.webp',
  '/heroes/community-tourism-1440.webp',
  '/heroes/community-conservation-1440.webp',
  '/heroes/community-employment-1440.webp',
  '/heroes/talk-to-us-480.webp',
] as const;

/** Default CLS-friendly dimensions (matches Tailwind aspect utilities). */
export const COUNTRY_IMAGE_DIMENSIONS = {
  homeDestination: { width: 800, height: 500 },
  countryHero: { width: 1440, height: 900 },
  countryCard: { width: 640, height: 400 },
  tourCard: { width: 640, height: 480 },
} as const;

export function officialCountryHeroPath(slug: string) {
  return countryHeroRemoteFallback(slug);
}

export function isOfficialCountryHeroPath(src: string) {
  const path = src.startsWith('/') ? src.split('?')[0] : '';
  return OFFICIAL_COUNTRY_HERO_FILE_SET.has(path);
}
