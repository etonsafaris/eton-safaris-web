import type { MetadataRoute } from 'next';
import { CORE_PAGE_SLUGS, countryPlacePath, destinationPublicPath } from '@/lib/cms-routes';
import { countryCategoryPath, canonicalCountrySlug } from '@/lib/country-utils';
import { fetchCollectionRecords, pickString, publicListColumnsFor, publicRecordSlug, recordPublishedAt } from '@/lib/data';
import { mergePublicDestinations } from '@/lib/public-destinations';
import {
  indexableContentKindForTable,
  shouldIndexPublicRecord,
  sitemapPriorityForRecord,
} from '@/lib/public-indexing';
import type { RecordRow } from '@/lib/types';

export const revalidate = 3600;

function sitemapColumns(table: string, aliases: string[] = []) {
  return (
    publicListColumnsFor(table, aliases) ||
    'id,name,title,slug,seo_slug,country,created_date,updated_date'
  );
}

function sitemapFetch(table: string, aliases: string[] = []) {
  // Cap rows so Vercel builds do not time out paging entire CMS tables.
  // Tours/parks/stays can be large; sitemap still covers the latest public URLs.
  const heavy = ['tours', 'national_park', 'national_parks', 'parks', 'accommodations', 'explore', 'safari_updates'];
  const isHeavy = [table, ...aliases].some((name) => heavy.includes(name.toLowerCase()));
  return fetchCollectionRecords(table, aliases, {
    columns: sitemapColumns(table, aliases),
    maxRows: isHeavy ? 500 : undefined,
  }).catch(() => [] as RecordRow[]);
}

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
  const raw = recordPublishedAt(row);
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function indexableRow(
  table: string,
  row: RecordRow,
  path: string,
  basePriority: number,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'
) {
  const kind = indexableContentKindForTable(table);
  if (!kind || !shouldIndexPublicRecord(row, kind)) return null;
  return entry(path, recordDate(row), sitemapPriorityForRecord(row, kind, basePriority), changeFrequency);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [tours, parks, stays, posts, places, pages, categories, countries] = await Promise.all([
    sitemapFetch('tours'),
    sitemapFetch('national_park', ['national_parks', 'parks']),
    sitemapFetch('accommodations'),
    sitemapFetch('safari_updates'),
    sitemapFetch('explore'),
    sitemapFetch('pages'),
    sitemapFetch('categories'),
    sitemapFetch('countries'),
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
    ...publicDestinations.map((item) =>
      entry(destinationPublicPath(item.slug), now, item.slug === 'uganda' ? 0.9 : 0.85)
    ),
  ];

  const dynamicEntries = [
    ...tours.map((row) => {
      const path = recordPath('/tours', row);
      return path ? indexableRow('tours', row, path, 0.8) : null;
    }),
    ...parks.map((row) => {
      const path = recordPath('/parks', row);
      return path ? indexableRow('national_park', row, path, 0.7) : null;
    }),
    ...stays.map((row) => {
      const path = recordPath('/accommodations', row);
      return path ? indexableRow('accommodations', row, path, 0.6) : null;
    }),
    ...posts.map((row) => {
      const path = recordPath('/safari-updates', row);
      return path ? indexableRow('safari_updates', row, path, 0.6, 'weekly') : null;
    }),
    ...places.map((row) => {
      const country = canonicalCountrySlug(pickString(row, ['country']));
      const path = country ? countryPlacePath(country, row) : recordPath('/explore', row);
      return path ? indexableRow('explore', row, path, 0.6) : null;
    }),
    ...pages.map((row) => {
      const slug = pickString(row, ['slug']);
      return slug ? indexableRow('pages', row, `/${slug.replace(/^\//, '')}`, 0.8) : null;
    }),
    ...categories.map((row) => {
      const country = canonicalCountrySlug(pickString(row, ['country']));
      const path = country ? countryCategoryPath(country, row) : null;
      return path ? indexableRow('categories', row, path, 0.7) : null;
    }),
  ].filter((item): item is MetadataRoute.Sitemap[number] => Boolean(item));

  const seen = new Set<string>();
  return [...staticEntries, ...dynamicEntries].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
