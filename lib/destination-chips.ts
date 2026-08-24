import { destinationPublicPath } from '@/lib/cms-routes';
import { canonicalCountrySlug, countryLabelFromSlug, normalizeSlug } from '@/lib/country-utils';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';

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
  const raw = String(name || '').trim();
  if (!raw || raw.length < 2) return '/destinations';
  const known = ALL_DESTINATIONS.find(
    (item) => item.slug === normalizeSlug(raw) || normalizeSlug(item.name) === normalizeSlug(raw)
  );
  const slug = known?.slug || canonicalCountrySlug(raw) || normalizeSlug(raw);
  return slug && slug.length >= 2 ? destinationPublicPath(slug) : '/destinations';
}

export function destinationDisplayName(name: string): string {
  const raw = String(name || '').trim();
  if (!raw || raw.length < 2) return '';
  const known = ALL_DESTINATIONS.find(
    (item) => item.slug === normalizeSlug(raw) || normalizeSlug(item.name) === normalizeSlug(raw)
  );
  return known?.name || countryLabelFromSlug(canonicalCountrySlug(raw) || normalizeSlug(raw)) || raw;
}

export function destinationFlagUrl(name: string, width = 80) {
  const iso = destinationIso(name);
  if (!iso) return '';
  return `https://flagcdn.com/w${width}/${iso}.png`;
}
