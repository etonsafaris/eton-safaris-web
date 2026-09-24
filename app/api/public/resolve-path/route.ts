import { NextResponse } from 'next/server';
import { isPrefixedPublicPath, normalizePrefixedPublicPath } from '@/lib/public-path-utils';
import { resolvePublicPathServer } from '@/lib/resolve-public-path-server';
import { isPgTooManyClientsError } from '@/lib/pg-retry';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/';
  const trimmed = path.trim();

  if (!trimmed || trimmed === '/') {
    return NextResponse.json({ path: '/' });
  }

  try {
    if (isPrefixedPublicPath(trimmed)) {
      return NextResponse.json({ path: normalizePrefixedPublicPath(trimmed) });
    }
    const resolved = await resolvePublicPathServer(trimmed);
    return NextResponse.json({ path: resolved });
  } catch (error) {
    console.error('[resolve-path]', error);
    if (isPgTooManyClientsError(error)) {
      return NextResponse.json(
        { path: normalizePrefixedPublicPath(trimmed), degraded: true },
        { status: 200 }
      );
    }
    return NextResponse.json({ path: normalizePrefixedPublicPath(trimmed) });
  }
}
