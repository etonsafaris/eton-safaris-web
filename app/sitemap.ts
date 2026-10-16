import type { MetadataRoute } from 'next';
import { CORE_PAGE_SLUGS, destinationPublicPath } from '@/lib/cms-routes';
import { countryCategoryPath, canonicalCountrySlug } from '@/lib/country-utils';
import {
  fetchCollectionRecords,
  isLanguagePost,
  pickString,
  publicListColumnsFor,
  publicRecordSlug,
  recordPublishedAt,
  safariUpdatePublicPath,
} from '@/lib/data';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import { mergePublicDestinations, seededDestinations } from '@/lib/public-destinations';
import {
  indexableContentKindForTable,
  shouldIndexPublicRecord,
  sitemapPriorityForRecord,
} from '@/lib/public-indexing';
import type { RecordRow } from '@/lib/types';
import { isNextProductionBuild } from '@/lib/build-phase';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;
export const maxDuration = 30;

function sitemapColumns(table: string, aliases: string[] = []) {
  return (
    publicListColumnsFor(table, aliases) ||
    'id,name,title,slug,seo_slug,country,status,published,is_published,created_date,updated_date,seo_schema,meta_description,robots_index,post_type'
  );
}

function sitemapFetch(table: string, aliases: string[] = []) {
  const load = fetchCollectionRecords(table, aliases, {
    columns: sitemapColumns(table, aliases),
    maxRows: 300,
  }).catch(() => [] as RecordRow[]);
  return new Promise<RecordRow[]>((resolve) => {
    const timer = setTimeout(() => resolve([]), 8000);
    load.then((rows) => {
      clearTimeout(timer);
      resolve(rows);
    });
  });
}

function entry(
  path: string,
  lastModified = new Date(),
  priority = 0.6,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'
): MetadataRoute.Sitemap[number] {
  return {
    url: publicCanonicalUrl(path || '/'),
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
  const raw =
    pickString(row, ['updated_date', 'updated_at', 'modified_at']) ||
    recordPublishedAt(row) ||
    pickString(row, ['created_date', 'created_at']);
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

function coreSitemapEntries(now = new Date()): MetadataRoute.Sitemap {
  const destinations = seededDestinations();
  return [
    entry('', now, 1, 'daily'),
    entry('/tours', now, 0.9),
    entry('/tours/compare', now, 0.7),
    entry('/safari-updates', now, 0.8),
    entry('/gallery', now, 0.6),
    entry('/safari-updates/rss.xml', now, 0.4, 'daily'),
    entry('/community-support', now, 0.8),
    entry('/contact-us', now, 0.8),
    entry('/request-a-quote', now, 0.9),
    entry('/destinations', now, 0.7),
    ...CORE_PAGE_SLUGS.map((slug) => entry(`/${slug}`, now, slug === 'about-us' ? 0.9 : 0.8)),
    ...destinations.map((item) =>
      entry(destinationPublicPath(item.slug), now, item.slug === 'uganda' ? 0.9 : 0.85)
    ),
  ];
}

function dedupeSitemap(items: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isNextProductionBuild()) {
    return coreSitemapEntries();
  }
  try {
    return await unstable_cache(buildSitemap, ['public-sitemap-v6-resilient'], {
      revalidate: 3600,
      tags: ['cms-public'],
    })();
  } catch (error) {
    console.error('[sitemap] Full build failed; serving core URLs:', error);
    return coreSitemapEntries();
  }
}

async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  try {
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
      entry('/tours/compare', now, 0.7),
      entry('/safari-updates', now, 0.8),
      entry('/gallery', now, 0.6),
      entry('/safari-updates/rss.xml', now, 0.4, 'daily'),
      entry('/community-support', now, 0.8),
      entry('/contact-us', now, 0.8),
      entry('/request-a-quote', now, 0.9),
      entry('/destinations', now, 0.7),
      ...CORE_PAGE_SLUGS.map((slug) => entry(`/${slug}`, now, slug === 'about-us' ? 0.9 : 0.8)),
      ...publicDestinations.map((item) =>
        entry(destinationPublicPath(item.slug), now, item.slug === 'uganda' ? 0.9 : 0.85)
      ),
    ];

    const dynamicEntries = [
      ...tours.map((row) => {
        // Google Only tours stay off public lists but remain indexable detail URLs.
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
        if (isLanguagePost(row)) return null;
        const path = safariUpdatePublicPath(row);
        return path && path !== '/safari-updates'
          ? indexableRow('safari_updates', row, path, 0.6, 'weekly')
          : null;
      }),
      ...places.map((row) => {
        const path = recordPath('/explore', row);
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

    return dedupeSitemap([...staticEntries, ...dynamicEntries]);
  } catch (error) {
    console.error('[sitemap] buildSitemap failed:', error);
    return coreSitemapEntries(now);
  }
}
