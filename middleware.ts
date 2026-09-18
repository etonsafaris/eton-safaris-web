import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
const PROTECTED_APIS = ['/api/settings/status', '/api/pesapal/test'];

function hasAdminSession(request: NextRequest) {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value === '1';
}

const REMOVED_ICON_PATHS = new Set(['/favicon.ico', '/icon.png', '/apple-icon.png', '/icon-192.png']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (REMOVED_ICON_PATHS.has(pathname)) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

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

  if (pathname.startsWith('/admin') && pathname !== '/admin/change-password') {
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
    '/admin/:path*', 
    '/landing', 
    '/landing/:path*', 
    '/api/settings/status', 
    '/api/pesapal/test',
    '/home-page',
    '/homepage',
    '/home',
    '/favicon.ico',
    '/icon.png',
    '/apple-icon.png',
    '/icon-192.png',
  ],
};
