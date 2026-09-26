import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const { pathname } = request.nextUrl;

  // 1. ISOLATED SUBDOMAIN ROUTING (admin.etonsafaris.com)
  if (hostname.startsWith('admin.')) {
    // Login lives at /login (not under /admin); do not prefix-map it
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return NextResponse.next();
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
    '/((?!_next/static|_next/image|assets|images|favicon.ico|api/).*)',
  ],
};
