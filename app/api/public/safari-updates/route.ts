import { loadSafariUpdatesListingResilient } from '@/lib/load-public';
import { NextResponse } from 'next/server';

export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(96, Math.max(1, Number(url.searchParams.get('limit') || 48)));
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  const loaded = await loadSafariUpdatesListingResilient({ limit, offset });
  return NextResponse.json(loaded, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}
