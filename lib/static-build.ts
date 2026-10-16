import { skipStaticGenerationDuringBuild } from '@/lib/build-phase';
import { db } from '@/lib/supabase/pool';

/** Lean columns for `generateStaticParams` (slug discovery only — no body HTML). */
export const STATIC_PARAM_COLUMNS = {
  tours: 'id,slug,seo_slug,title,published,status,is_published',
  accommodations: 'id,slug,seo_slug,title,published,status,is_published',
  national_park: 'id,slug,seo_slug,title,published,status,is_published',
  countries: 'id,slug,seo_slug,name,title,published,status,is_published',
  safari_updates: 'id,slug,seo_slug,title,published,status,is_published,publish_date',
} as const;

export const PUBLIC_PAGE_REVALIDATE_SECONDS = 900;

const SLUG_QUERY_MS = 2000;

export function staticBuildParamLimit() {
  const fromEnv = Number(process.env.BUILD_STATIC_PARAMS_LIMIT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.min(800, Math.floor(fromEnv));
  return 200;
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

function normalizeSlug(value: unknown) {
  try {
    return String(value || '')
      .replace(/^\//, '')
      .trim();
  } catch {
    return '';
  }
}

/**
 * Lightweight Aiven slug scan for generateStaticParams.
 * Timed and crash-proof so a slow pool cannot fail `next build`.
 */
export async function queryActivePublicSlugs(tables: string[], limit = staticBuildParamLimit()): Promise<string[]> {
  if (skipStaticGenerationDuringBuild()) return [];
  const cap = Math.max(1, Math.min(800, limit));
  const seen = new Set<string>();

  for (const table of tables.filter(Boolean)) {
    const queries = [
      `SELECT COALESCE(NULLIF(TRIM(seo_slug::text), ''), NULLIF(TRIM(slug::text), '')) AS slug
FROM ${table}
WHERE COALESCE(NULLIF(TRIM(seo_slug::text), ''), NULLIF(TRIM(slug::text), '')) IS NOT NULL
LIMIT ${cap}`,
      `SELECT NULLIF(TRIM(slug::text), '') AS slug FROM ${table} WHERE slug IS NOT NULL LIMIT ${cap}`,
      `SELECT NULLIF(TRIM(seo_slug::text), '') AS slug FROM ${table} WHERE seo_slug IS NOT NULL LIMIT ${cap}`,
    ];

    for (const sql of queries) {
      try {
        const rows = await withBudget(
          db.query<{ slug?: string }>(sql).then((result) => result?.rows ?? []),
          SLUG_QUERY_MS,
          [] as Array<{ slug?: string }>
        );
        for (const row of rows ?? []) {
          const slug = normalizeSlug(row?.slug);
          if (slug) seen.add(slug);
        }
        if (seen.size) break;
      } catch (error) {
        console.warn(`[static-params] ${table} slug query skipped:`, error);
      }
    }
    if (seen.size) break;
  }

  return [...seen].slice(0, cap);
}

export function slugsToStaticParams(slugs: string[]): { slug: string }[] {
  try {
    return (slugs ?? [])
      .map((slug) => normalizeSlug(slug))
      .filter(Boolean)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

/** Tiny neutral blur for LCP heroes (no extra network request). */
export const IMAGE_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';
