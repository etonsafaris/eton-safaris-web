import { unstable_noStore as noStore } from 'next/cache';
import { categoryMatchesCountry, matchesCountry } from '@/lib/country-utils';
import { fetchCollectionRecords, isLanguagePost, isPublishedRecord, pickString } from '@/lib/data';
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
