import { canonicalCountrySlug } from '@/lib/country-utils';
import { getRecordTitle, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

const EAST_AFRICA = ['uganda', 'kenya', 'tanzania', 'rwanda'] as const;

function tourCountrySlug(tour: RecordRow): string {
  return canonicalCountrySlug(pickString(tour, ['country', 'destination', 'country_name']));
}

function featuredScore(tour: RecordRow): number {
  let score = 0;
  if (tour.is_featured === true || tour.featured === true) score += 100;
  if (tour.is_popular === true) score += 40;
  if (tour.show_on_landing === true) score += 30;
  const slug = tourCountrySlug(tour);
  const eastIndex = EAST_AFRICA.indexOf(slug as (typeof EAST_AFRICA)[number]);
  if (eastIndex >= 0) score += 50 - eastIndex * 5;
  return score;
}

/** Homepage & marketing: East Africa first, then admin-featured flags. */
export function orderHomeFeaturedTours(tours: RecordRow[], limit = 12): RecordRow[] {
  const pool = (tours ?? []).filter(Boolean);
  return pool
    .slice()
    .sort((a, b) => {
      const diff = featuredScore(b) - featuredScore(a);
      if (diff !== 0) return diff;
      return getRecordTitle(a).localeCompare(getRecordTitle(b));
    })
    .slice(0, limit);
}
