import type { MetadataRoute } from 'next';
import { CORE_PAGE_SLUGS, countryPlacePath, destinationPublicPath } from '@/lib/cms-routes';
import { countryCategoryPath } from '@/lib/country-utils';
import { fetchCollectionRecords, pickDateValue, pickString, publicRecordSlug } from '@/lib/data';
import { mergePublicDestinations } from '@/lib/public-destinations';
import type { RecordRow } from '@/lib/types';

function entry(
  path: string,
  lastModified = new Date(),
  priority = 0.6,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'
): MetadataRoute.Sitemap[number] {
  return {
    url: `https://etonsafaris.com${path || '/'}`,
    lastModified,
    changeFrequency,
    priority,
  };
}

function recordPath(base: string, row: RecordRow) {
  const slug = publicRecordSlug(row);
  if (!slug) return null;
  return `${base}/${slug.replace(/^\//, '')}`;
}

function recordDate(row: RecordRow) {
  const raw = pickDateValue(row, ['published_at', 'updated_at', 'created_at']);
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [tours, parks, stays, posts, places, pages, categories, countries] = await Promise.all([
    fetchCollectionRecords('tours').catch(() => []),
    fetchCollectionRecords('national_park', ['national_parks', 'parks']).catch(() => []),
    fetchCollectionRecords('accommodations').catch(() => []),
    fetchCollectionRecords('safari_updates').catch(() => []),
    fetchCollectionRecords('explore').catch(() => []),
    fetchCollectionRecords('pages').catch(() => []),
    fetchCollectionRecords('categories').catch(() => []),
    fetchCollectionRecords('countries').catch(() => []),
  ]);
  const publicDestinations = mergePublicDestinations(countries);

  const staticEntries = [
    entry('', now, 1, 'daily'),
    entry('/tours', now, 0.9),
    entry('/parks', now, 0.8),
    entry('/accommodations', now, 0.8),
    entry('/safari-updates', now, 0.8),
    entry('/safari-updates/rss.xml', now, 0.4, 'daily'),
    entry('/community-support', now, 0.8),
    entry('/contact-us', now, 0.8),
    entry('/request-a-quote', now, 0.9),
    entry('/explore', now, 0.7),
    entry('/destinations', now, 0.7),
    ...CORE_PAGE_SLUGS.map((slug) =>
      entry(`/${slug}`, now, slug === 'about-us' ? 0.9 : 0.8)
    ),
    ...NAV_COUNTRIES.map((item) => entry(destinationPublicPath(item.slug), now, 0.9)),
    ...OTHER_DESTINATIONS.map((item) => entry(destinationPublicPath(item.slug), now, 0.85)),
  ];

  const dynamicEntries = [
    ...tours.map((row) => {
      const path = recordPath('/tours', row);
      return path ? entry(path, recordDate(row), 0.8) : null;
    }),
    ...parks.map((row) => {
      const path = recordPath('/parks', row);
      return path ? entry(path, recordDate(row), 0.7) : null;
    }),
    ...stays.map((row) => {
      const path = recordPath('/accommodations', row);
      return path ? entry(path, recordDate(row), 0.6) : null;
    }),
    ...posts.map((row) => {
      const path = recordPath('/safari-updates', row);
      return path ? entry(path, recordDate(row), 0.6, 'weekly') : null;
    }),
    ...places.map((row) => {
      const country = pickString(row, ['country']);
      const path = country ? countryPlacePath(country, row) : recordPath('/explore', row);
      return path ? entry(path, recordDate(row), 0.6) : null;
    }),
    ...pages.map((row) => {
      const slug = pickString(row, ['slug']);
      return slug ? entry(`/${slug.replace(/^\//, '')}`, recordDate(row), 0.8) : null;
    }),
    ...categories.map((row) => {
      const country = pickString(row, ['country']);
      const path = country ? countryCategoryPath(country, row) : null;
      return path ? entry(path, recordDate(row), 0.7) : null;
    }),
  ].filter((item): item is MetadataRoute.Sitemap[number] => Boolean(item));

  const seen = new Set<string>();
  return [...staticEntries, ...dynamicEntries].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
