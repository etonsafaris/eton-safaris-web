import { countryPlacePath } from '@/lib/cms-routes';
import { canonicalCountrySlug } from '@/lib/country-utils';
import {
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickPlainText,
  pickString,
  publicRecordSlug,
} from '@/lib/data';
import { scoreTourMatch } from '@/lib/tour-search';
import type { RecordRow } from '@/lib/types';

export type DiscoveryKind = 'park' | 'stay' | 'place';

export function discoveryPublicPath(kind: DiscoveryKind, row: RecordRow): string {
  const slug = publicRecordSlug(row);
  if (!slug) return '/tours';
  if (kind === 'park') return `/parks/${slug}`;
  if (kind === 'stay') return `/accommodations/${slug}`;
  const country = canonicalCountrySlug(pickString(row, ['country']));
  if (country) return countryPlacePath(country, row);
  return `/explore/${slug}`;
}

export function scoreDiscoveryMatch(row: RecordRow, query: string): number {
  return scoreTourMatch(row, query);
}

export function suggestDiscovery(
  rows: RecordRow[],
  query: string,
  limit = 6
): RecordRow[] {
  const q = query.trim();
  if (q.length < 2) return [];
  return rows
    .filter(isPublishedRecord)
    .map((row) => ({ row, score: scoreDiscoveryMatch(row, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.row);
}

export type DiscoverySearchCard = {
  kind: DiscoveryKind;
  href: string;
  title: string;
  image: string;
  meta: string;
  kindLabel: string;
};

export function discoverySearchCard(kind: DiscoveryKind, row: RecordRow): DiscoverySearchCard {
  const kindLabel = kind === 'park' ? 'National Park' : kind === 'stay' ? 'Accommodation' : 'Place';
  return {
    kind,
    href: discoveryPublicPath(kind, row),
    title: getRecordTitle(row),
    image: getRecordImage(row) || '',
    meta: pickString(row, ['country', 'location', 'destination']) || pickPlainText(row, ['excerpt', 'description']),
    kindLabel,
  };
}
