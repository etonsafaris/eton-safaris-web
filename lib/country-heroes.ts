import { countrySlugFromLanding } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';
import { countryHeroRemoteFallback } from '@/lib/country-hero-fallback';
import {
  OFFICIAL_COUNTRY_HERO_PATHS,
  officialCountryHeroPath,
} from '@/lib/official-country-assets';
import { getPublicRecordImage } from '@/lib/record-image';
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

const FILES = OFFICIAL_COUNTRY_HERO_PATHS;

/** Generic safari fallback — never the Eton logo on destination cards. */
export const DEFAULT_COUNTRY_HERO = countryHeroRemoteFallback('kenya');

export const COUNTRY_HERO_IMAGES = FILES;

export function bundledCountryHero(slug?: string | null) {
  const key = countrySlugFromLanding(slug || '') || normalizeSlug(slug || '');
  return countryHeroRemoteFallback(key || 'kenya');
}

/** Map legacy duplicate `/heroes` paths to the single official file per country. */
export function canonicalizeBundledCountryHero(slug: string, src: string) {
  const pathname = imagePathname(src.trim());
  if (!pathname.startsWith('/heroes/')) return src;
  const official = bundledCountryHero(slug);
  if (isBundledHeroForSlug(slug, src)) return official;
  return official;
}

/**
 * Single source for country hero + cards: same URL on home, destination pages, and `/destinations`.
 * CMS cover first (Cloudinary, `/api/media`, etc.), then shipped `/heroes` art for that slug only.
 */
export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const slugKey = resolveCountrySlug(slug, record);
  const fromCms = record ? getPublicRecordImage(record) : null;
  if (isDeployableImageUrl(fromCms)) {
    if (isLiveCmsImage(fromCms) && !fromCms.includes('/heroes/community')) return fromCms;
    if (isBundledHeroAsset(fromCms) && slugKey && isBundledHeroForSlug(slugKey, fromCms)) {
      return canonicalizeBundledCountryHero(slugKey, fromCms);
    }
  }
  return bundledCountryHero(slugKey || slug);
}
