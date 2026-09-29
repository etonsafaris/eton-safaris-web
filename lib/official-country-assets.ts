/**
 * Legacy bundled country hero paths under `public/heroes` (optional on disk).
 * Public site uses admin uploads only — not these paths.
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

export const OFFICIAL_COMMUNITY_HERO_PATHS = [
  '/heroes/community-hero-768.webp',
  '/heroes/community-tourism-1440.webp',
  '/heroes/community-conservation-1440.webp',
  '/heroes/community-employment-1440.webp',
  '/heroes/talk-to-us-480.webp',
] as const;

export const COUNTRY_IMAGE_DIMENSIONS = {
  homeDestination: { width: 800, height: 500 },
  countryHero: { width: 1440, height: 900 },
  countryCard: { width: 640, height: 400 },
  tourCard: { width: 640, height: 480 },
} as const;

export function officialCountryHeroPath(_slug: string) {
  return '';
}

export function isOfficialCountryHeroPath(_src: string) {
  return false;
}
