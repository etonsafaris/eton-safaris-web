import { countryLabelFromSlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';

export type CountryPageData = {
  country: RecordRow | null;
  categories: RecordRow[];
  tours: RecordRow[];
  parks: RecordRow[];
  places: RecordRow[];
};

export const EMPTY_COUNTRY_PAGE_DATA: CountryPageData = {
  country: null,
  categories: [],
  tours: [],
  parks: [],
  places: [],
};

export function isCountryPageDataSparse(data: CountryPageData): boolean {
  return (
    data.categories.length === 0 &&
    data.tours.length === 0 &&
    data.parks.length === 0 &&
    data.places.length === 0
  );
}

export function withCountryPageFallback(data: CountryPageData, slug: string): CountryPageData {
  const name = countryLabelFromSlug(slug) || slug;
  const country =
    data.country ||
    ({
      name,
      title: name,
      slug,
    } as RecordRow);
  return { ...data, country };
}
