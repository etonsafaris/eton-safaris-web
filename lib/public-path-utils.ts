export const KNOWN_PUBLIC_FIRST_SEGMENTS = new Set([
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

export function splitPublicPath(path: string) {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = withoutHash.indexOf('?');
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : '';
  return { pathname, search, hash };
}

export function pathSegments(pathname: string) {
  return pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

/** Paths that already include a collection prefix — no DB lookup needed. */
export function isPrefixedPublicPath(path: string) {
  const { pathname } = splitPublicPath(path.trim());
  const segments = pathSegments(pathname);
  if (segments.length === 0) return true;
  if (segments.length >= 2) return true;
  return KNOWN_PUBLIC_FIRST_SEGMENTS.has(segments[0].toLowerCase());
}

export function normalizePrefixedPublicPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';
  const { pathname, search, hash } = splitPublicPath(trimmed);
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${normalized}${search}${hash}`;
}
