import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route isolation:
 * - Public guests: www.etonsafaris.com / etonsafaris.com — /admin, /login, and /dashboard
 *   go to admin.etonsafaris.com and keep the path and query (password-reset links included).
 * - Preview hosts (*.vercel.app) still render those pages.
 * - Staff panel: admin.etonsafaris.com — only /admin and /login; all other paths → www.
 */

const ADMIN_PATH_PREFIXES = ['/admin', '/login', '/dashboard'];

function mainSiteOrigin(adminHostname: string): string {
  const bare = adminHostname.replace(/^admin\./i, '').toLowerCase();
  if (bare === 'etonsafaris.com') return 'https://www.etonsafaris.com';
  return `https://${bare}`;
}

function isMainPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().split(':')[0];
  return /^(www\.)?etonsafaris\.com$/i.test(host) || /\.vercel\.app$/i.test(host);
}

function isAdminHost(hostname: string): boolean {
  return /^admin\./i.test(hostname);
}

/** Files under `public/` that must not be rewritten on admin.etonsafaris.com */
function isPublicStaticAsset(pathname: string): boolean {
  if (pathname === '/eton-safaris-gorilla.png' || pathname === '/favicon.ico' || pathname === '/robots.txt') {
    return true;
  }
  if (
    pathname.startsWith('/images/') ||
    pathname.startsWith('/heroes/') ||
    pathname.startsWith('/flags/') ||
    pathname.startsWith('/_next/')
  ) {
    return true;
  }
  return /\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|webmanifest|txt|xml)$/i.test(pathname);
}

function isBlockedAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAdminAppPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/') || pathname.startsWith('/admin');
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const { pathname, search } = request.nextUrl;

  if (isAdminHost(hostname)) {
    if (isPublicStaticAsset(pathname)) {
      return NextResponse.next();
    }

    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return NextResponse.next();
    }

    if (pathname === '/') {
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }

    if (pathname.startsWith('/admin')) {
      return NextResponse.next();
    }

    // Public URLs on the admin host (e.g. /tours, /destinations) must not rewrite to /admin/* (404).
    return NextResponse.redirect(new URL(`${pathname}${search}`, mainSiteOrigin(hostname)));
  }

  if (isMainPublicHost(hostname) && isBlockedAdminPath(pathname)) {
    const host = hostname.toLowerCase().split(':')[0];
    if (/\.vercel\.app$/i.test(host)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(`https://admin.etonsafaris.com${pathname}${search}`));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|assets|images|heroes|flags|favicon.ico|eton-safaris-gorilla.png|api/).*)',
  ],
};
