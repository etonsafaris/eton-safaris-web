import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';

const PROTECTED_APIS = ['/api/settings/status', '/api/pesapal/test'];

const PUBLIC_SITE_HOSTS = new Set(['etonsafaris.com', 'www.etonsafaris.com']);

function hasAdminSession(request: NextRequest) {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value === '1';
}

const REMOVED_ICON_PATHS = new Set(['/favicon.ico', '/icon.png', '/apple-icon.png', '/icon-192.png']);

const SITE_APEX = 'etonsafaris.com';

function requestHostname(request: NextRequest): string {
  const raw =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    '';
  return raw.split(',')[0].trim().split(':')[0].toLowerCase();
}

/** First label when host is a subdomain of the apex (e.g. `admin` from `admin.etonsafaris.com`). */
function parseActiveSubdomain(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (host === SITE_APEX || host === `www.${SITE_APEX}`) return null;
  if (host.endsWith(`.${SITE_APEX}`)) {
    const prefix = host.slice(0, -(SITE_APEX.length + 1));
    if (!prefix) return null;
    const labels = prefix.split('.').filter(Boolean);
    return labels.length ? labels[labels.length - 1] : null;
  }
  if (host === 'admin.localhost') return 'admin';
  return null;
}

function configuredAdminHosts(): Set<string> {
  const hosts = new Set(['admin.etonsafaris.com']);
  const fromEnv = process.env.ADMIN_HOST || process.env.NEXT_PUBLIC_ADMIN_HOST;
  if (fromEnv) {
    hosts.add(fromEnv.split(':')[0].toLowerCase());
  }
  return hosts;
}

/** Admin panel is served from a dedicated hostname (clean URLs, no /admin prefix in the bar). */
function isAdminSubdomainHost(hostname: string): boolean {
  if (parseActiveSubdomain(hostname) === 'admin') return true;
  if (configuredAdminHosts().has(hostname)) return true;
  return false;
}

function isConsumerSiteHost(hostname: string): boolean {
  if (isAdminSubdomainHost(hostname)) return false;
  if (PUBLIC_SITE_HOSTS.has(hostname)) return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.endsWith('.vercel.app')) return true;
  return false;
}

function isAdminHostPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/change-password' ||
    pathname.startsWith('/change-password/')
  );
}

/** Map clean admin-host paths to internal App Router paths under /admin. */
function adminHostInternalPath(pathname: string): string {
  if (pathname === '/' || pathname === '') return '/admin';
  if (isAdminHostPublicPath(pathname)) {
    if (pathname === '/change-password' || pathname.startsWith('/change-password/')) {
      const suffix = pathname.slice('/change-password'.length);
      return `/admin/change-password${suffix}`;
    }
    return pathname;
  }
  return `/admin${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function stripAdminPrefixForCleanUrl(pathname: string): string | null {
  if (pathname === '/admin' || pathname === '/admin/') return '/';
  if (pathname.startsWith('/admin/')) {
    const rest = pathname.slice('/admin'.length);
    return rest.length ? rest : '/';
  }
  return null;
}

function handleAdminSubdomain(request: NextRequest): NextResponse | null {
  const hostname = requestHostname(request);
  if (!isAdminSubdomainHost(hostname)) return null;

  const { pathname } = request.nextUrl;

  const cleanPath = stripAdminPrefixForCleanUrl(pathname);
  if (cleanPath !== null) {
    const destination = request.nextUrl.clone();
    destination.pathname = cleanPath;
    return NextResponse.redirect(destination);
  }

  if (isAdminHostPublicPath(pathname)) {
    if (pathname.startsWith('/change-password')) {
      const url = request.nextUrl.clone();
      url.pathname = adminHostInternalPath(pathname);
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (!hasAdminSession(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname === '/' ? '/' : pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = adminHostInternalPath(pathname);
  return NextResponse.rewrite(rewriteUrl);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (REMOVED_ICON_PATHS.has(pathname)) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  const adminSubdomainResponse = handleAdminSubdomain(request);
  if (adminSubdomainResponse) return adminSubdomainResponse;

  if (pathname === '/home-page' || pathname === '/homepage' || pathname === '/home') {
    const home = request.nextUrl.clone();
    home.pathname = '/';
    home.search = '';
    return NextResponse.redirect(home);
  }

  if (pathname === '/landing' || pathname.startsWith('/landing/')) {
    if (!hasAdminSession(request)) {
      const segment = pathname.split('/').filter(Boolean)[1] || '';
      const country = segment.replace(/-safaris$/i, '');
      const destination = request.nextUrl.clone();
      destination.pathname = country ? `/destinations/${country}` : '/destinations';
      destination.search = '';
      return NextResponse.redirect(destination);
    }
  }

  if (PROTECTED_APIS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const auth = request.headers.get('authorization') || '';
    if (!auth.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const hostname = requestHostname(request);
  if (
    isConsumerSiteHost(hostname) &&
    pathname.startsWith('/admin') &&
    pathname !== '/admin/change-password'
  ) {
    if (!hasAdminSession(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|eot|css|js|map|mp4|webm|txt|xml)$).*)',
    '/favicon.ico',
    '/icon.png',
    '/apple-icon.png',
    '/icon-192.png',
  ],
};
