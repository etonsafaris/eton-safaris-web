import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const { pathname, search } = request.nextUrl;

  // 1. ISOLATED SUBDOMAIN ROUTING (admin.etonsafaris.com)
  if (hostname.startsWith('admin.')) {
    if (isPublicStaticAsset(pathname)) {
      return NextResponse.next();
    }

    // Login lives at /login (not under /admin); do not prefix-map it
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return NextResponse.next();
    }

    if (isPublicGuestPath(pathname, search)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, mainSiteOrigin(hostname)));
    }

    // Silently map the root to the internal admin view structure
    if (pathname === '/') {
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }
    // Maintain internal subfolder continuity for deep panel links
    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 2. MAIN PUBLIC DOMAIN PROTECTION SECURITY (etonsafaris.com)
  // If a user hits the standard website domain but attempts to access /admin, /login, or /admin/login
  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
    // Intercept them immediately and force-redirect them safely to the public homepage
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
