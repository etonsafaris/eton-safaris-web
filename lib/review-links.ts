import { pickNumber, pickString } from '@/lib/data';
import { SITE } from '@/lib/collections';
import type { RecordRow } from '@/lib/types';

export type ReviewSourceId =
  | 'tripadvisor'
  | 'google'
  | 'safaribookings'
  | 'travelstride'
  | 'safaripicked'
  | 'trustpilot'
  | 'website';

export type ReviewSource = {
  id: ReviewSourceId;
  label: string;
  match: string[];
  href: string;
};

const encodedBrand = encodeURIComponent(`${SITE.name} reviews`);

export const REVIEW_SOURCES: ReviewSource[] = [
  {
    id: 'tripadvisor',
    label: 'Tripadvisor',
    match: ['tripadvisor', 'trip advisor'],
    href: `https://www.tripadvisor.com/Search?q=${encodedBrand}`,
  },
  {
    id: 'google',
    label: 'Google',
    match: ['google'],
    href: `https://www.google.com/search?q=${encodedBrand}`,
  },
  {
    id: 'safaribookings',
    label: 'SafariBookings',
    match: ['safaribookings', 'safari bookings'],
    href: 'https://www.safaribookings.com/',
  },
  {
    id: 'travelstride',
    label: 'Travelstride',
    match: ['travelstride'],
    href: 'https://www.travelstride.com/',
  },
  {
    id: 'safaripicked',
    label: 'SafariPicked',
    match: ['safaripicked', 'safari picked'],
    href: 'https://www.safaripicked.com/',
  },
  {
    id: 'trustpilot',
    label: 'Trustpilot',
    match: ['trustpilot'],
    href: 'https://www.trustpilot.com/',
  },
  {
    id: 'website',
    label: 'Website',
    match: ['website', 'eton'],
    href: '#safari-reviews',
  },
];

export const REVIEW_SOURCE_LABELS = REVIEW_SOURCES.map((item) => item.label);

function sourceMatches(review: RecordRow, source: ReviewSource) {
  const value = pickString(review, ['source']).toLowerCase();
  if (!value) return false;
  return source.match.some((token) => value.includes(token));
}

export function reviewExternalHref(review: RecordRow): string {
  const explicit = pickString(review, ['source_url', 'url', 'link']).trim();
  if (explicit.startsWith('http') || explicit.startsWith('/')) return explicit;

  const source = REVIEW_SOURCES.find((item) => sourceMatches(review, item));
  return source?.href || REVIEW_SOURCES.find((item) => item.id === 'website')?.href || '/contact-us';
}

export type ReviewSourceBadge = {
  id: ReviewSourceId;
  label: string;
  href: string;
  score: number;
  count: number;
  external: boolean;
};

export function reviewSourceBadges(reviews: RecordRow[]): ReviewSourceBadge[] {
  return REVIEW_SOURCES.map((source) => {
    const rows = reviews.filter((review) => sourceMatches(review, source));
    const profile = rows
      .map((row) => pickString(row, ['source_url', 'url', 'link']).trim())
      .find((url) => url.startsWith('http') || url.startsWith('/'));
    const score = rows.length
      ? rows.reduce((sum, row) => sum + pickNumber(row, ['rating'], 5), 0) / rows.length
      : 4.9;
    return {
      id: source.id,
      label: source.label,
      href: profile || source.href,
      score,
      count: rows.length,
      external: Boolean((profile || source.href).startsWith('http')),
    };
  });
}
