import {
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickNumber,
  pickPlainText,
  pickString,
  publicRecordSlug,
  slugify,
} from '@/lib/data';
import { matchesCategoryValue } from '@/lib/country-utils';
import { publicCardImageSrc } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[] = new Array(rows * cols);
  for (let i = 0; i < rows; i += 1) matrix[i * cols] = i;
  for (let j = 0; j < cols; j += 1) matrix[j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i * cols + j] = Math.min(
        matrix[(i - 1) * cols + j] + 1,
        matrix[i * cols + j - 1] + 1,
        matrix[(i - 1) * cols + j - 1] + cost
      );
    }
  }
  return matrix[a.length * cols + b.length];
}

function haystack(tour: RecordRow): string {
  return [
    getRecordTitle(tour),
    pickString(tour, ['country', 'destination']),
    pickString(tour, ['category']),
    pickPlainText(tour, ['description', 'excerpt', 'keywords', 'focus_keyphrase']),
  ]
    .join(' ')
    .toLowerCase();
}

export function scoreTourMatch(tour: RecordRow, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = getRecordTitle(tour).toLowerCase();
  const blob = haystack(tour);
  if (title === q) return 100;
  if (title.includes(q) || blob.includes(q)) return 90;

  const queryTokens = tokens(q);
  if (!queryTokens.length) return 0;
  const titleTokens = tokens(title);
  const blobTokens = tokens(blob);
  const allInTitle = queryTokens.every((token) => titleTokens.some((word) => word.includes(token) || token.includes(word)));
  if (allInTitle) return 80;
  const allInBlob = queryTokens.every((token) => blobTokens.some((word) => word.includes(token) || token.includes(word)));
  if (allInBlob) return 70;

  const fuzzyHits = queryTokens.filter((token) =>
    titleTokens.some((word) => Math.abs(word.length - token.length) <= 2 && levenshtein(word, token) <= 2)
  ).length;
  if (fuzzyHits === queryTokens.length) return 55;
  if (fuzzyHits > 0) return 35 + fuzzyHits * 5;

  const partial = queryTokens.filter((token) => blob.includes(token)).length;
  return partial ? 20 + (partial / queryTokens.length) * 20 : 0;
}

function durationMatches(days: number, range: string): boolean {
  if (!range) return true;
  if (!days) return true;
  if (range === '1-3') return days >= 1 && days <= 3;
  if (range === '4-7') return days >= 4 && days <= 7;
  if (range === '8-14') return days >= 8 && days <= 14;
  if (range === '15+') return days >= 15;
  return true;
}

export function searchPublishedTours(
  tours: RecordRow[],
  query: string,
  destination = '',
  category = '',
  duration = ''
): RecordRow[] {
  const dest = destination.trim().toLowerCase();
  const cat = decodeURIComponent(category).trim().toLowerCase().replace(/-/g, ' ');

  return tours
    .filter(isPublishedRecord)
    .filter((tour) => {
      if (dest && dest !== 'all destinations') {
        const country = pickString(tour, ['country', 'destination']).toLowerCase();
        if (!country.includes(dest) && slugify(country) !== slugify(dest)) return false;
      }
      if (cat && !matchesCategoryValue(tour, category) && !matchesCategoryValue(tour, cat)) {
        return false;
      }
      if (!durationMatches(pickNumber(tour, ['duration_days', 'days', 'duration']), duration)) return false;
      if (!query.trim()) return true;
      return scoreTourMatch(tour, query) > 0;
    })
    .sort((a, b) => (query.trim() ? scoreTourMatch(b, query) - scoreTourMatch(a, query) : 0));
}

export function tourPublicPath(tour: RecordRow): string {
  return `/tours/${publicRecordSlug(tour)}`;
}

export function suggestTours(tours: RecordRow[], query: string, limit = 6): RecordRow[] {
  if (query.trim().length < 2) return [];
  return searchPublishedTours(tours, query).slice(0, limit);
}

export function tourSearchCard(tour: RecordRow) {
  const days = pickNumber(tour, ['duration_days', 'days', 'duration']);
  return {
    href: tourPublicPath(tour),
    title: getRecordTitle(tour),
    image: publicCardImageSrc(getRecordImage(tour)),
    destination: pickString(tour, ['country', 'destination']),
    description: pickPlainText(tour, ['description', 'excerpt']),
    duration: days > 0 ? `${days} days` : '',
  };
}
