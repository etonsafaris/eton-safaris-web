export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SITE } from '@/lib/collections';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';

function siteUrl(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`.replace(/\/$/, '');
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE.url).replace(/\/$/, '');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  const origin = siteUrl(request);
  const activatePath = id
    ? `/admin/registered_agents/activate?id=${encodeURIComponent(id)}`
    : '/admin/registered_agents';

  const cookie = request.headers.get('cookie') || '';
  const hasAdmin = cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
  if (!hasAdmin) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(activatePath)}`);
  }

  return NextResponse.redirect(`${origin}${activatePath}`);
}
