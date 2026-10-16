import type { MetadataRoute } from 'next';
import { destinationPublicPath } from '@/lib/cms-routes';
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
import { mergePublicDestinations, seededDestinations } from '@/lib/public-destinations';
import {
  indexableContentKindForTable,
  shouldIndexPublicRecord,
  sitemapPriorityForRecord,
} from '@/lib/public-indexing';
import { coreSitemapEntries, sitemapEntry } from '@/lib/sitemap-core';
import type { RecordRow } from '@/lib/types';
import { isNextProductionBuild } from '@/lib/build-phase';
import { unstable_cache } from 'next/cache';

/** Never block Google or the public site — sitemap must always return 200 quickly. */
export const dynamic = 'force-dynamic';
export const revalidate = 3600;
export const maxDuration = 15;

const SITEMAP_FETCH_MS = 2500;
const SITEMAP_TOTAL_MS = 4000;

export { coreSitemapEntries } from '@/lib/sitemap-core';

function sitemapColumns(table: string, aliases: string[] = []) {
  return (
    publicListColumnsFor(table, aliases) ||
    'id,name,title,slug,seo_slug,country,status,published,is_published,created_date,updated_date,robots_index,post_type'
  );
}

function sitemapFetch(table: string, aliases: string[] = []) {
  const load = fetchCollectionRecords(table, aliases, {
    columns: sitemapColumns(table, aliases),
    maxRows: 200,
  }).catch(() => [] as RecordRow[]);
  return new Promise<RecordRow[]>((resolve) => {
    const timer = setTimeout(() => resolve([]), SITEMAP_FETCH_MS);
    load
      .then((rows) => {
        clearTimeout(timer);
        resolve(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve([]);
      });
  });
}

function recordPath(base: string, row: RecordRow) {
  try {
    const slug = publicRecordSlug(row);
    if (!slug) return null;
    return `${base}/${slug.replace(/^\//, '')}`;
  } catch {
    return null;
  }
}

function recordDate(row: RecordRow) {
  try {
    const raw =
      pickString(row, ['updated_date', 'updated_at', 'modified_at']) ||
      recordPublishedAt(row) ||
      pickString(row, ['created_date', 'created_at']);
    const date = raw ? new Date(raw) : new Date();
    return Number.isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}

function indexableRow(
  table: string,
  row: RecordRow,
  path: string,
  basePriority: number,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'
) {
  try {
    const kind = indexableContentKindForTable(table);
    if (!kind || !shouldIndexPublicRecord(row, kind)) return null;
    return sitemapEntry(
      path,
      recordDate(row),
      sitemapPriorityForRecord(row, kind, basePriority),
      changeFrequency
    );
  } catch {
    return null;
  }
}

function dedupeSitemap(items: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function buildSitemapLive(): Promise<MetadataRoute.Sitemap> {
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

  let publicDestinations = seededDestinations();
  try {
    publicDestinations = mergePublicDestinations(countries);
  } catch {
    /* keep seeded */
  }

  const hubs = coreSitemapEntries(now).filter((item) => !/\/destinations\/[^/]+$/.test(item.url));
  const destinationEntries = publicDestinations.map((item) =>
    sitemapEntry(destinationPublicPath(item.slug), now, item.slug === 'uganda' ? 0.9 : 0.85)
  );

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
      try {
        if (isLanguagePost(row)) return null;
        const path = safariUpdatePublicPath(row);
        return path && path !== '/safari-updates'
          ? indexableRow('safari_updates', row, path, 0.6, 'weekly')
          : null;
      } catch {
        return null;
      }
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
      try {
        const country = canonicalCountrySlug(pickString(row, ['country']));
        const path = country ? countryCategoryPath(country, row) : null;
        return path ? indexableRow('categories', row, path, 0.7) : null;
      } catch {
        return null;
      }
    }),
  ].filter((item): item is MetadataRoute.Sitemap[number] => Boolean(item));

  return dedupeSitemap([...hubs, ...destinationEntries, ...dynamicEntries]);
}

async function getCachedFullSitemap(): Promise<MetadataRoute.Sitemap> {
  return unstable_cache(buildSitemapLive, ['public-sitemap-v7-fast-safe'], {
    revalidate: 3600,
    tags: ['cms-public', 'sitemap'],
  })();
}

function withBudget<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

/**
 * Sitemap must never 500 and must never stall the public site.
 * Prefer a full cached build; if DB/cache is slow or broken, serve core URLs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const core = coreSitemapEntries();
  if (isNextProductionBuild()) return core;

  try {
    const full = await withBudget(getCachedFullSitemap(), SITEMAP_TOTAL_MS, core);
    return full?.length ? full : core;
  } catch (error) {
    console.error('[sitemap] Serving core URLs after failure:', error);
    return core;
  }
}
