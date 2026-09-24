import { fetchRecordByPublicSlug, isPublishedRecord, publicRecordSlug } from '@/lib/data';

const KNOWN_FIRST_SEGMENTS = new Set([
  'tours',
  'parks',
  'accommodations',
  'explore',
  'safari-updates',
  'destinations',
  'pages',
  'landing',
  'admin',
  'payment',
  'verify',
  'quote',
  'invite',
  'agents',
  'login',
  'contact-us',
  'about-us',
  'privacy-policies',
  'terms-of-services',
  'community-support',
  'request-a-quote',
  'tours-and-travel-agency',
]);

const SLUG_LOOKUPS: Array<{ table: string; prefix: string; aliases?: string[] }> = [
  { table: 'tours', prefix: '/tours' },
  { table: 'national_park', prefix: '/parks', aliases: ['national_parks', 'parks'] },
  { table: 'accommodations', prefix: '/accommodations' },
  { table: 'explore', prefix: '/explore' },
  { table: 'safari_updates', prefix: '/safari-updates' },
];

function splitPathAndSuffix(path: string) {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = withoutHash.indexOf('?');
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : '';
  return { pathname, search, hash };
}

const resolveCache = new Map<string, string>();

/** Map bare slugs (/my-tour) to the correct public route (/tours/my-tour). */
export async function resolvePublicContentPath(path: string): Promise<string> {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';

  const cached = resolveCache.get(trimmed);
  if (cached) return cached;

  const { pathname, search, hash } = splitPathAndSuffix(trimmed);
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  if (segments.length === 0) {
    const resolved = `/${search}${hash}`;
    resolveCache.set(trimmed, resolved);
    return resolved;
  }

  if (segments.length >= 2 || KNOWN_FIRST_SEGMENTS.has(segments[0].toLowerCase())) {
    const resolved = `${pathname.startsWith('/') ? pathname : `/${pathname}`}${search}${hash}`;
    resolveCache.set(trimmed, resolved);
    return resolved;
  }

  const slug = decodeURIComponent(segments[0]);
  for (const item of SLUG_LOOKUPS) {
    const row = await fetchRecordByPublicSlug(item.table, slug, item.aliases || []);
    if (row && isPublishedRecord(row)) {
      const publicSlug = publicRecordSlug(row) || slug;
      const resolved = `${item.prefix}/${publicSlug}${search}${hash}`;
      resolveCache.set(trimmed, resolved);
      return resolved;
    }
  }

  const fallback = `${pathname.startsWith('/') ? pathname : `/${pathname}`}${search}${hash}`;
  resolveCache.set(trimmed, fallback);
  return fallback;
}

export function warmResolvePublicContentPath(path: string): Promise<string> {
  const trimmed = path.trim();
  if (!trimmed) return Promise.resolve('/');
  const existing = resolveCache.get(trimmed);
  if (existing) return Promise.resolve(existing);
  return resolvePublicContentPath(trimmed);
}
