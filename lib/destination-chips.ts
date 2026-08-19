import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { destinationPublicPath } from '@/lib/cms-routes';
import { normalizeSlug } from '@/lib/country-utils';

const EXTRA_ISO: Record<string, string> = {
  zimbabwe: 'zw',
  madagascar: 'mg',
  seychelles: 'sc',
  mozambique: 'mz',
  morocco: 'ma',
  zanzibar: 'tz',
};

export const ABOUT_DESTINATION_CHIPS = [
  'Tanzania',
  'Rwanda',
  'Kenya',
  'Zimbabwe',
  'South Africa',
  'Uganda',
  'Malawi',
  'Namibia',
  'Botswana',
  'Zambia',
  'Madagascar',
  'Seychelles',
  'Mozambique',
  'Morocco',
  'Egypt',
];

const ALL_DESTINATIONS = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS];

export function destinationIso(name: string): string {
  const slug = normalizeSlug(name);
  const known = ALL_DESTINATIONS.find((item) => item.slug === slug || normalizeSlug(item.name) === slug);
  return known?.iso || EXTRA_ISO[slug] || '';
}

export function destinationHref(name: string): string {
  const slug = normalizeSlug(name);
  if (ALL_DESTINATIONS.some((item) => item.slug === slug || normalizeSlug(item.name) === slug)) {
    return destinationPublicPath(slug);
  }
  return `/tours`;
}

export function destinationFlagUrl(name: string, width = 80) {
  const iso = destinationIso(name);
  if (!iso) return '';
  return `https://flagcdn.com/w${width}/${iso}.png`;
}
