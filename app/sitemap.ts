import type { MetadataRoute } from 'next';
import { destinationPublicPath } from '@/lib/cms-routes';
import { countryCategoryPath, canonicalCountrySlug } from '@/lib/country-utils';
import {
  isLanguagePost,
  pickString,
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
import { db } from '@/lib/supabase/pool';
import type { RecordRow } from '@/lib/types';
import { isNextProductionBuild } from '@/lib/build-phase';

/** Never block Google or the public site — sitemap must always return 200 quickly. */
export const dynamic = 'force-dynamic';
export const revalidate = 3600;
export const maxDuration = 15;

const SITEMAP_QUERY_MS = 2500;
const SITEMAP_TOTAL_MS = 4000;
const TOUR_SITEMAP_LIMIT = 8000;
const CATALOG_SITEMAP_LIMIT = 3000;

export { coreSitemapEntries } from '@/lib/sitemap-core';

const SLUG_SELECT = `COALESCE(NULLIF(TRIM(seo_slug::text), ''), NULLIF(TRIM(slug::text), '')) AS slug`;
const DATE_SELECT = `COALESCE(updated_date, updated_at, created_date, created_at, NOW()) AS updated_at`;

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

async function queryRows(sql: string): Promise<RecordRow[]> {
  try {
    const result = await db.query<RecordRow>(sql);
    return Array.isArray(result?.rows) ? result.rows : [];
  } catch (error) {
    console.error('[sitemap] Query failed, skipping this catalog:', error);
    return [];
  }
}

async function sitemapQuery(sql: string): Promise<RecordRow[]> {
  return withBudget(queryRows(sql), SITEMAP_QUERY_MS, [] as RecordRow[]);
}

function recordDate(row: RecordRow | null | undefined) {
  try {
    const raw =
      pickString(row || {}, ['updated_date', 'updated_at', 'modified_at']) ||
      recordPublishedAt(row || {}) ||
      pickString(row || {}, ['created_date', 'created_at']);
    const date = raw ? new Date(raw) : new Date();
    return Number.isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}

function indexableRow(
  table: string,
  row: RecordRow | null | undefined,
  path: string | null | undefined,
  basePriority: number,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'
) {
  try {
    if (!row || !path) return null;
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

function slugPath(base: string, row: RecordRow | null | undefined) {
  try {
    const slug =
      publicRecordSlug(row || {}) ||
      pickString(row || {}, ['slug', 'seo_slug']) ||
      '';
    if (!slug) return null;
    return `${base}/${slug.replace(/^\//, '')}`;
  } catch {
    return null;
  }
}

function dedupeSitemap(items: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return (items || []).filter((item) => {
    if (!item?.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function fetchCatalog(tables: string | string[], extraSelect = '', limit = CATALOG_SITEMAP_LIMIT) {
  const extras = extraSelect ? `, ${extraSelect}` : '';
  for (const table of Array.isArray(tables) ? tables : [tables]) {
    const full = await sitemapQuery(
      `SELECT ${SLUG_SELECT}, ${DATE_SELECT}, robots_index, status, published, is_published, post_type${extras}
FROM ${table}
WHERE COALESCE(NULLIF(TRIM(seo_slug::text), ''), NULLIF(TRIM(slug::text), '')) IS NOT NULL
LIMIT ${limit}`
    );
    if (full.length) return full;

    const bySlug = await sitemapQuery(
      `SELECT NULLIF(TRIM(slug::text), '') AS slug, ${DATE_SELECT}
FROM ${table}
WHERE slug IS NOT NULL
LIMIT ${limit}`
    );
    if (bySlug.length) return bySlug;

    const bySeo = await sitemapQuery(
      `SELECT NULLIF(TRIM(seo_slug::text), '') AS slug, ${DATE_SELECT}
FROM ${table}
WHERE seo_slug IS NOT NULL
LIMIT ${limit}`
    );
    if (bySeo.length) return bySeo;
  }
  return [];
}

async function buildSitemapLive(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [tours, parks, stays, posts, places, pages, categories, countries] = await Promise.all([
    fetchCatalog('tours', '', TOUR_SITEMAP_LIMIT),
    fetchCatalog(['national_park', 'national_parks', 'parks']),
    fetchCatalog('accommodations'),
    fetchCatalog('safari_updates'),
    fetchCatalog('explore'),
    fetchCatalog('pages'),
    fetchCatalog('categories', 'country'),
    fetchCatalog('countries', 'name', 200),
  ]);

  let publicDestinations = seededDestinations();
  try {
    publicDestinations = mergePublicDestinations(countries);
  } catch {
    /* keep seeded */
  }

  const hubs = coreSitemapEntries(now).filter((item) => !/\/destinations\/[^/]+$/.test(item?.url || ''));
  const destinationEntries = (publicDestinations || []).map((item) => {
    try {
      return sitemapEntry(destinationPublicPath(item?.slug), now, item?.slug === 'uganda' ? 0.9 : 0.85);
    } catch {
      return null;
    }
  });

  const dynamicEntries = [
    ...(tours || []).map((row) => indexableRow('tours', row, slugPath('/tours', row), 0.8)),
    ...(parks || []).map((row) => indexableRow('national_park', row, slugPath('/parks', row), 0.7)),
    ...(stays || []).map((row) => indexableRow('accommodations', row, slugPath('/accommodations', row), 0.6)),
    ...(posts || []).map((row) => {
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
    ...(places || []).map((row) => indexableRow('explore', row, slugPath('/explore', row), 0.6)),
    ...(pages || []).map((row) => {
      try {
        const slug = pickString(row, ['slug']);
        return slug ? indexableRow('pages', row, `/${slug.replace(/^\//, '')}`, 0.8) : null;
      } catch {
        return null;
      }
    }),
    ...(categories || []).map((row) => {
      try {
        const country = canonicalCountrySlug(pickString(row, ['country']));
        const path = country ? countryCategoryPath(country, row) : null;
        return path ? indexableRow('categories', row, path, 0.7) : null;
      } catch {
        return null;
      }
    }),
  ].filter((item): item is MetadataRoute.Sitemap[number] => Boolean(item));

  return dedupeSitemap([
    ...hubs,
    ...destinationEntries.filter((item): item is MetadataRoute.Sitemap[number] => Boolean(item)),
    ...dynamicEntries,
  ]);
}

/**
 * Automated sitemap for Google. Queries Aiven for every public slug.
 * Timed fallbacks keep this from 500ing or stalling the public site.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const core = coreSitemapEntries();
  if (isNextProductionBuild()) return core;

  try {
    const full = await withBudget(buildSitemapLive(), SITEMAP_TOTAL_MS, core);
    return Array.isArray(full) && full.length ? full : core;
  } catch (error) {
    console.error('Sitemap compilation fallback activated:', error);
    return core?.length
      ? core
      : [{ url: 'https://etonsafaris.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 }];
  }
}
