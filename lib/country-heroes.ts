import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { getRecordImage } from '@/lib/record-image';
import { isBundledHeroAsset, isDeployableImageUrl, isLiveCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

function imagePathname(src: string) {
  if (src.startsWith('/') && !src.startsWith('//')) return src.split('?')[0];
  try {
    return new URL(src).pathname;
  } catch {
    return src.split('?')[0];
  }
}

/** Reject CMS rows that still point at another country's bundled `/heroes` file. */
function isBundledHeroForSlug(slug: string, src: string) {
  const pathname = imagePathname(src.trim());
  if (!pathname.startsWith('/heroes/')) return false;
  const expected = bundledCountryHero(slug);
  if (pathname === imagePathname(expected)) return true;
  const key = countrySlugFromLanding(slug) || normalizeSlug(slug);
  const base = pathname
    .replace(/^\/heroes\//, '')
    .replace(/-\d+\.(webp|avif)$/i, '')
    .replace(/\.(webp|jpe?g|avif|png)$/i, '');
  return base === key;
}

export function resolveCountrySlug(slug?: string | null, record?: RecordRow | null) {
  const fromRecord = record ? String(record.slug || record.name || record.title || '') : '';
  return countrySlugFromLanding(slug || fromRecord) || normalizeSlug(slug || fromRecord);
}

/** Bundled safari art shipped under `public/heroes` (restored from repo history). */
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

/** Generic safari fallback — never the Eton logo on destination cards. */
export const DEFAULT_COUNTRY_HERO = '/heroes/kenya.jpg';

export const COUNTRY_HERO_IMAGES = FILES;

export function bundledCountryHero(slug?: string | null) {
  const key = countrySlugFromLanding(slug || '') || normalizeSlug(slug || '');
  return FILES[key] || DEFAULT_COUNTRY_HERO;
}

/**
 * Single source for country hero + cards: same URL on home, destination pages, and `/destinations`.
 * CMS cover first (Cloudinary, `/api/media`, etc.), then shipped `/heroes` art for that slug only.
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const slugKey = resolveCountrySlug(slug, record);
  const fromCms = record ? getRecordImage(record) : null;
  if (isDeployableImageUrl(fromCms)) {
    if (isLiveCmsImage(fromCms)) return fromCms;
    if (isBundledHeroAsset(fromCms) && slugKey && isBundledHeroForSlug(slugKey, fromCms)) {
      return fromCms;
    }
  }
  return bundledCountryHero(slugKey || slug);
}
