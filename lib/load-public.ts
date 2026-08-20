import { unstable_noStore as noStore } from 'next/cache';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { categoryMatchesCountry, matchesCategoryValue, matchesCountry } from '@/lib/country-utils';
import { fetchCollectionRecords, getRecordTitle, isLanguagePost, isPublishedRecord, pickString } from '@/lib/data';
import { normalizeSlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';

export async function loadPublishedRecords(table: string, aliases: string[] = []): Promise<RecordRow[]> {
  noStore();
  try {
    const rows = await fetchCollectionRecords(table, aliases);
    return rows.filter(isPublishedRecord);
  } catch {
    return [];
  }
}

export function findCountryRecord(rows: RecordRow[], slug: string) {
  const needle = normalizeSlug(slug);
  return (
    rows.find((row) => normalizeSlug(pickString(row, ['slug', 'name', 'title'])) === needle) || null
  );
}

export function findRecordBySlug(rows: RecordRow[], slug: string) {
  const needle = normalizeSlug(slug);
  return (
    rows.find((row) => normalizeSlug(pickString(row, ['slug', 'seo_slug'])) === needle) ||
    rows.find((row) => String(row.id) === slug) ||
    null
  );
}

export async function loadCmsPage(slug: string) {
  noStore();
  try {
    const rows = await fetchCollectionRecords('pages');
    const match = matchCmsRecord(rows, slug, pageAliases(slug));
    return match && isPublishedRecord(match) ? match : null;
  } catch {
    return null;
  }
}

export async function loadHomePageData() {
  noStore();
  const [countries, tours, updates, parks, categories] = await Promise.all([
    loadPublishedRecords('countries'),
    loadPublishedRecords('tours'),
    loadPublishedRecords('safari_updates'),
    loadPublishedRecords('national_park', ['national_parks', 'parks']),
    fetchCollectionRecords('categories').catch(() => [] as RecordRow[]),
  ]);
  return {
    countries,
    tours,
    updates: updates.filter((row) => !isLanguagePost(row)),
    parks,
    categories,
  };
}

export async function loadCountryPageData(slug: string) {
  noStore();
  const [countries, categories, tours, parks, places] = await Promise.all([
    loadPublishedRecords('countries'),
    loadPublishedRecords('categories'),
    loadPublishedRecords('tours'),
    loadPublishedRecords('national_park', ['national_parks', 'parks']),
    loadPublishedRecords('explore'),
  ]);
  return {
    country: findCountryRecord(countries, slug),
    categories: categories.filter((row) => categoryMatchesCountry(row, slug)),
    tours: tours.filter((row) => matchesCountry(row, slug)),
    parks: parks.filter((row) => matchesCountry(row, slug)),
    places: places.filter((row) => matchesCountry(row, slug)),
  };
}

export async function loadTourDetail(slug: string) {
  noStore();
  const tours = await loadPublishedRecords('tours');
  const tour = findRecordBySlug(tours, slug);
  const country = tour ? pickString(tour, ['country']) : '';
  const category = tour ? pickString(tour, ['category']) : '';
  const sameCountry = tours.filter((row) => row !== tour && (!country || matchesCountry(row, country)));
  const sameCategory = category ? sameCountry.filter((row) => matchesCategoryValue(row, category)) : [];
  return {
    tour,
    related: (sameCategory.length ? sameCategory : sameCountry).slice(0, 12),
  };
}

export async function loadParkDetail(slug: string) {
  noStore();
  const [parks, accommodations] = await Promise.all([
    loadPublishedRecords('national_park', ['national_parks', 'parks']),
    loadPublishedRecords('accommodations'),
  ]);
  const park = findRecordBySlug(parks, slug);
  const parkName = park ? getRecordTitle(park) : '';
  return {
    park,
    others: parks.filter((row) => row !== park).slice(0, 20),
    stays: accommodations.filter((item) => {
      const name = pickString(item, ['national_park', 'park', 'park_name']);
      return Boolean(parkName && name && name.toLowerCase() === parkName.toLowerCase());
    }),
  };
}
