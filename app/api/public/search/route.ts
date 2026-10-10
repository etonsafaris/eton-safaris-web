import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };

/** Parks, stays, and explore places are sitemap-only. Public search does not load them. */
export async function GET() {
  return NextResponse.json({ parks: [], stays: [], places: [] }, { headers: CACHE_HEADERS });
}
