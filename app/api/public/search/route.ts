import { NextResponse } from 'next/server';
import type { RecordRow } from '@/lib/types';
import { discoverySearchCard, suggestDiscovery, type DiscoveryKind } from '@/lib/discovery-search';
import { fetchCollectionRecords, publicListColumnsFor } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };

function listColumns(table: string, aliases: string[] = []) {
  return publicListColumnsFor(table, aliases);
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() || '';
  if (q.length < 2) {
    return NextResponse.json({ parks: [], stays: [], places: [] }, { headers: CACHE_HEADERS });
  }

  try {
    const places = await fetchCollectionRecords('explore', [], {
      columns: listColumns('explore'),
      maxRows: 120,
    });

    const pack = (kind: DiscoveryKind, rows: RecordRow[]) =>
      suggestDiscovery(rows, q, 6).map((row) => discoverySearchCard(kind, row));

    return NextResponse.json(
      {
        parks: [],
        stays: [],
        places: pack('place', places),
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[Search] Discovery lookup failed:', error);
    return NextResponse.json(
      { data: [], parks: [], stays: [], places: [], error: true },
      { status: 200, headers: CACHE_HEADERS }
    );
  }
}
