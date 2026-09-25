import { CMS_PUBLIC_HTTP_CACHE_CONTROL, CMS_PUBLIC_REVALIDATE_SECONDS } from '@/lib/cms-public-cache';
import { loadSafariUpdateDetailResilient } from '@/lib/load-public';
import { normalizeSlug } from '@/lib/country-utils';
import { NextResponse } from 'next/server';

export const revalidate = CMS_PUBLIC_REVALIDATE_SECONDS;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }
  const detail = await loadSafariUpdateDetailResilient(slug);
  return NextResponse.json(detail, {
    headers: {
      'Cache-Control': CMS_PUBLIC_HTTP_CACHE_CONTROL,
    },
  });
}
