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
  ghana: 'gh',
  nigeria: 'ng',
  senegal: 'sn',
  'ivory-coast': 'ci',
  'cote-divoire': 'ci',
  cameroon: 'cm',
  gabon: 'ga',
  angola: 'ao',
  lesotho: 'ls',
  eswatini: 'sz',
  swaziland: 'sz',
  'cape-verde': 'cv',
  mauritius: 'mu',
  reunion: 're',
  sudan: 'sd',
  'south-sudan': 'ss',
  eritrea: 'er',
  djibouti: 'dj',
  somalia: 'so',
  burundi: 'bi',
  'sao-tome-and-principe': 'st',
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
  return slug ? destinationPublicPath(slug) : '/destinations';
}

export function destinationFlagUrl(name: string, width = 80) {
  const iso = destinationIso(name);
  if (!iso) return '';
  return `https://flagcdn.com/w${width}/${iso}.png`;
}
