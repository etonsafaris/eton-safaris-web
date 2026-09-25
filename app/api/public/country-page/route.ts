import { normalizeSlug } from '@/lib/country-utils';
import { loadCountryPageDataResilient } from '@/lib/load-public';
import { NextResponse } from 'next/server';

export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }
  const data = await loadCountryPageDataResilient(slug);
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}
