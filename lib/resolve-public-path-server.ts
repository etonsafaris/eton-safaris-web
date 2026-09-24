import {
  fetchRecordByPublicSlug,
  isPublishedRecord,
  publicRecordSlug,
} from '@/lib/data-server';
import {
  isPrefixedPublicPath,
  normalizePrefixedPublicPath,
  pathSegments,
  splitPublicPath,
} from '@/lib/public-path-utils';

const SLUG_LOOKUPS: Array<{ table: string; prefix: string; aliases?: string[] }> = [
  { table: 'tours', prefix: '/tours' },
  { table: 'national_park', prefix: '/parks', aliases: ['national_parks', 'parks'] },
  { table: 'accommodations', prefix: '/accommodations' },
  { table: 'explore', prefix: '/explore' },
  { table: 'safari_updates', prefix: '/safari-updates' },
];

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
  for (const item of SLUG_LOOKUPS) {
    const row = await fetchRecordByPublicSlug(item.table, slug, item.aliases || []);
    if (row && isPublishedRecord(row)) {
      const publicSlug = publicRecordSlug(row) || slug;
      return `${item.prefix}/${publicSlug}${search}${hash}`;
    }
  }

  return normalizePrefixedPublicPath(trimmed);
}
