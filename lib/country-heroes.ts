import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { getRecordImage } from '@/lib/data';
import { isLiveCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

const FILES: Record<string, string> = {
  uganda: '/heroes/uganda.jpg',
  kenya: '/heroes/kenya.jpg',
  tanzania: '/heroes/tanzania.jpg',
  rwanda: '/heroes/rwanda.jpg',
  botswana: '/heroes/botswana.jpg',
  egypt: '/heroes/egypt.jpg',
  namibia: '/heroes/namibia.jpg',
  'south-africa': '/heroes/south-africa.jpg',
  'dr-congo': '/heroes/dr-congo.jpg',
  ethiopia: '/heroes/ethiopia.jpg',
  malawi: '/heroes/malawi.jpg',
  zambia: '/heroes/zambia.jpg',
};

export const DEFAULT_COUNTRY_HERO = '/heroes/kenya.jpg';

export const COUNTRY_HERO_IMAGES = FILES;

export function bundledCountryHero(slug?: string | null) {
  const key = countrySlugFromLanding(slug || '') || normalizeSlug(slug || '');
  return FILES[key] || DEFAULT_COUNTRY_HERO;
}

/** Prefer the admin-uploaded country image; fall back to files in public/heroes. */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const fromCms = record ? getRecordImage(record) : null;
  if (isLiveCmsImage(fromCms)) return fromCms;
  const fromRecord = record ? String(record.slug || record.name || record.title || '') : '';
  return bundledCountryHero(slug || fromRecord);
}
