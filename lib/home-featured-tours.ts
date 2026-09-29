import { canonicalCountrySlug, matchesCountry } from '@/lib/country-utils';
import { getRecordTitle, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

/** Core East Africa destinations — homepage “Popular Tours” carousel only shows these. */
export const HOME_POPULAR_TOUR_COUNTRIES = ['uganda', 'kenya', 'tanzania', 'rwanda'] as const;

export type HomePopularTourCountry = (typeof HOME_POPULAR_TOUR_COUNTRIES)[number];

function tourCountrySlug(tour: RecordRow): string {
  return canonicalCountrySlug(pickString(tour, ['country', 'destination', 'country_name']));
}

export function isEastAfricaHomeTour(tour: RecordRow): boolean {
  if (!tour || typeof tour !== 'object') return false;
  return HOME_POPULAR_TOUR_COUNTRIES.some((slug) => matchesCountry(tour, slug));
}

function primaryEastAfricaSlug(tour: RecordRow): HomePopularTourCountry | '' {
  for (const slug of HOME_POPULAR_TOUR_COUNTRIES) {
    if (matchesCountry(tour, slug)) return slug;
  }
  const fallback = tourCountrySlug(tour);
  if (HOME_POPULAR_TOUR_COUNTRIES.includes(fallback as HomePopularTourCountry)) {
    return fallback as HomePopularTourCountry;
  }
  return '';
}

function featuredScore(tour: RecordRow): number {
  let score = 0;
  if (tour.is_featured === true || tour.featured === true) score += 100;
  if (tour.is_popular === true) score += 40;
  if (tour.show_on_landing === true) score += 30;
  const slug = primaryEastAfricaSlug(tour);
  const eastIndex = slug ? HOME_POPULAR_TOUR_COUNTRIES.indexOf(slug) : -1;
  if (eastIndex >= 0) score += 50 - eastIndex * 5;
  return score;
}

/** Rotate carousel items across Uganda → Kenya → Tanzania → Rwanda when possible. */
function interleaveEastAfricaTours(sorted: RecordRow[]): RecordRow[] {
  const buckets: Record<HomePopularTourCountry, RecordRow[]> = {
    uganda: [],
    kenya: [],
    tanzania: [],
    rwanda: [],
  };
  const unmatched: RecordRow[] = [];

  for (const tour of sorted) {
    const slug = primaryEastAfricaSlug(tour);
    if (slug) buckets[slug].push(tour);
    else unmatched.push(tour);
  }

  const out: RecordRow[] = [];
  const maxDepth = Math.max(...HOME_POPULAR_TOUR_COUNTRIES.map((slug) => buckets[slug].length));
  for (let index = 0; index < maxDepth; index += 1) {
    for (const slug of HOME_POPULAR_TOUR_COUNTRIES) {
      const row = buckets[slug][index];
      if (row) out.push(row);
    }
  }
  return [...out, ...unmatched];
}

function filterEastAfricaTours(tours: RecordRow[]): RecordRow[] {
  return (tours ?? []).filter((tour) => isEastAfricaHomeTour(tour));
}

/** Homepage & marketing: East Africa tours only, then admin-featured flags. */
export function orderHomeFeaturedTours(tours: RecordRow[], limit = 12): RecordRow[] {
  const pool = filterEastAfricaTours(tours);
  const sorted = pool
    .slice()
    .sort((a, b) => {
      const diff = featuredScore(b) - featuredScore(a);
      if (diff !== 0) return diff;
      return getRecordTitle(a).localeCompare(getRecordTitle(b));
    });
  return interleaveEastAfricaTours(sorted).slice(0, limit);
}

/** Popular Tours section: featured East Africa rows first, else any published East Africa tour. */
export function selectHomePopularTours(tours: RecordRow[], limit = 12): RecordRow[] {
  const eastPool = filterEastAfricaTours(tours ?? []);
  if (!eastPool.length) return [];
  const flagged = eastPool.filter(
    (tour) => tour?.is_featured || tour?.is_popular || tour?.show_on_landing
  );
  const pool = flagged.length ? flagged : eastPool;
  return orderHomeFeaturedTours(pool, limit);
}
