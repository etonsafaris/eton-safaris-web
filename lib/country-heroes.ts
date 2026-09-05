import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { getRecordImage } from '@/lib/data';
import { isLiveCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

const FILES: Record<string, string> = {
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

export const DEFAULT_COUNTRY_HERO = '/heroes/kenya.jpg';

export const COUNTRY_HERO_IMAGES = FILES;

export function bundledCountryHero(slug?: string | null) {
  const key = countrySlugFromLanding(slug || '') || normalizeSlug(slug || '');
  return FILES[key] || DEFAULT_COUNTRY_HERO;
}

function recordLooksSaved(record?: RecordRow | null) {
  if (!record) return false;
  return Boolean(record.id || record.image_url || record.title || record.name || record.slug);
}

/** Prefer the admin-uploaded country image. Do not resurrect bundled heroes after CMS content exists. */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const fromCms = record ? getRecordImage(record) : null;
  if (isLiveCmsImage(fromCms)) return fromCms;
  if (recordLooksSaved(record)) return fromCms || '';
  const fromRecord = record ? String(record.slug || record.name || record.title || '') : '';
  return bundledCountryHero(slug || fromRecord);
}
