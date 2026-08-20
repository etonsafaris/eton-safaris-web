import { getRecordImage } from '@/lib/data';
import { DEFAULT_PUBLIC_IMAGE, isDeployableImageUrl } from '@/lib/public-image';
import { normalizeSlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=70`;

/** Public HTTPS heroes that Vercel can load without local /media files. */
export const COUNTRY_HERO_IMAGES: Record<string, string> = {
  uganda: unsplash('photo-1489392191049-fc10c97e64b6'),
  kenya: unsplash('photo-1516426122078-c23e76319840'),
  tanzania: unsplash('photo-1523805009345-7448845a9e53'),
  rwanda: unsplash('photo-1547970810-dc8fa3298e51'),
  botswana: unsplash('photo-1543946207-39bd91e70ca7'),
  egypt: unsplash('photo-1539650116574-75c0c6d73f6e'),
  namibia: unsplash('photo-1509316785289-025f5b846b35'),
  'south-africa': unsplash('photo-1484318571209-661cf29a69c3'),
  'dr-congo': unsplash('photo-1564760055775-d63b17a55c44'),
  ethiopia: unsplash('photo-1523805009345-7448845a9e53'),
  malawi: unsplash('photo-1501785888041-af3ef285b470'),
  zambia: unsplash('photo-1472396961693-142e6e269027'),
};

export function bundledCountryHero(slug?: string | null) {
  const key = normalizeSlug(slug || '');
  return COUNTRY_HERO_IMAGES[key] || DEFAULT_PUBLIC_IMAGE;
}

export function countryHeroImage(slug?: string | null, record?: RecordRow | null) {
  const fromCms = getRecordImage(record || {});
  if (fromCms && isDeployableImageUrl(fromCms) && !fromCms.startsWith('/media/')) return fromCms;
  const fromName = record ? normalizeSlug(String(record.slug || record.name || record.title || '')) : '';
  return bundledCountryHero(slug || fromName);
}
