import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route isolation (Dav-style):
 * - Public guests: etonsafaris.com / www.etonsafaris.com — never serve /admin or /login.
 * - Staff panel: admin.etonsafaris.com — internal rewrite to /admin/* (clean URLs on admin host).
 */

const ADMIN_PATH_PREFIXES = ['/admin', '/login', '/dashboard'];

/** Public guest URLs that must not be rewritten to /admin/* on admin.etonsafaris.com */
function isPublicGuestPath(pathname: string, search: string): boolean {
  if (pathname === '/tours' && search) return true;
  if (/^\/tours\/[^/]+\/?$/.test(pathname)) {
    const segment = pathname.split('/')[2] || '';
    return segment !== 'new';
  }
  if (/^\/tours\/[^/]+\/edit\/?$/.test(pathname)) return false;
  return /^\/(destinations|parks|safari-updates|accommodations|explore|tours-and-travel-agency|about-us|contact-us|privacy-policies|terms-of-services|community-support|request-a-quote)\/[^/]+/i.test(
    pathname
  );
}

function mainSiteOrigin(adminHostname: string): string {
  const bare = adminHostname.replace(/^admin\./i, '');
  return `https://${bare}`;
}

function isMainPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().split(':')[0];
  return /^(www\.)?etonsafaris\.com$/i.test(host) || /\.vercel\.app$/i.test(host);
}

function isAdminHost(hostname: string): boolean {
  return /^admin\./i.test(hostname);
}

/** Files under `public/` that must not be rewritten to `/admin/*` on admin.etonsafaris.com */
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

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const { pathname, search } = request.nextUrl;

  // ——— Admin subdomain: rewrite to internal /admin app (address bar stays on admin.etonsafaris.com) ———
  if (isAdminHost(hostname)) {
    if (isPublicStaticAsset(pathname)) {
      return NextResponse.next();
    }

    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return NextResponse.next();
    }

    if (isPublicGuestPath(pathname, search)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, mainSiteOrigin(hostname)));
    }

    if (pathname === '/') {
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }
    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // ——— Main public site: block panel URLs (send guests to homepage) ———
  if (isMainPublicHost(hostname) && isBlockedAdminPath(pathname)) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|assets|images|heroes|flags|favicon.ico|eton-safaris-gorilla.png|api/).*)',
  ],
};
