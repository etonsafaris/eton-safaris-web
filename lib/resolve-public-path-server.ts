import { db } from '@/lib/supabase/pool';
import {
  isPrefixedPublicPath,
  normalizePrefixedPublicPath,
  pathSegments,
  splitPublicPath,
} from '@/lib/public-path-utils';

const SLUG_LOOKUPS = [
  { table: 'tours', prefix: '/tours' },
  { table: 'national_park', prefix: '/parks' },
  { table: 'accommodations', prefix: '/accommodations' },
  { table: 'explore', prefix: '/explore' },
  { table: 'safari_updates', prefix: '/safari-updates' },
] as const;

async function pathForSlug(slug: string): Promise<string> {
  for (const item of SLUG_LOOKUPS) {
    for (const sql of [
      `SELECT slug FROM ${item.table} WHERE slug = $1 OR seo_slug = $1 LIMIT 1`,
      `SELECT slug FROM ${item.table} WHERE slug = $1 LIMIT 1`,
    ]) {
      try {
        const found = await db.query<{ slug?: string }>(sql, [slug]);
        const rowSlug = String(found.rows[0]?.slug || '').trim();
        if (rowSlug) return `${item.prefix}/${rowSlug}`;
        break;
      } catch {
        /* try the simpler slug lookup, then the next table */
      }
    }
  }
  return '';
}

/** Resolve a public path on the server (one DB round-trip chain max per slug). */
export async function resolvePublicPathServer(path: string): Promise<string> {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';

  if (isPrefixedPublicPath(trimmed)) {
    return normalizePrefixedPublicPath(trimmed);
  }

  const { pathname, search, hash } = splitPublicPath(trimmed);
  const segments = pathSegments(pathname);
  if (segments.length !== 1) {
    return normalizePrefixedPublicPath(trimmed);
  }

  const slug = decodeURIComponent(segments[0]);
  const match = await pathForSlug(slug);
  if (match) return `${match}${search}${hash}`;

  return normalizePrefixedPublicPath(trimmed);
}
