import { coreSitemapEntries, sitemapEntriesToXml } from '@/lib/sitemap-core';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;
export const maxDuration = 10;
export const runtime = 'nodejs';

/**
 * Crash-proof sitemap XML for Google.
 * Always returns 200 with core URLs — never depends on a heavy DB fan-out.
 */
export async function GET() {
  try {
    const body = sitemapEntriesToXml(coreSitemapEntries());
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[sitemap-api] unexpected failure:', error);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://etonsafaris.com/</loc><priority>1.0</priority></url>
  <url><loc>https://etonsafaris.com/destinations</loc><priority>0.9</priority></url>
  <url><loc>https://etonsafaris.com/tours</loc><priority>0.9</priority></url>
  <url><loc>https://etonsafaris.com/contact-us</loc><priority>0.8</priority></url>
</urlset>
`;
    return new NextResponse(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  }
}
