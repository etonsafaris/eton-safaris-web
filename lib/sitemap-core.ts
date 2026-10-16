import type { MetadataRoute } from 'next';
import { CORE_PAGE_SLUGS, destinationPublicPath } from '@/lib/cms-routes';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import { seededDestinations } from '@/lib/public-destinations';

export function sitemapEntry(
  path: string,
  lastModified = new Date(),
  priority = 0.6,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'
): MetadataRoute.Sitemap[number] {
  try {
    return {
      url: publicCanonicalUrl(path || '/'),
      lastModified,
      changeFrequency,
      priority,
    };
  } catch {
    return {
      url: `https://etonsafaris.com${path || '/'}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    };
  }
}

/** Always-safe core URLs — enough for Google if DB/cache is down. */
export function coreSitemapEntries(now = new Date()): MetadataRoute.Sitemap {
  const destinations = seededDestinations();
  return [
    sitemapEntry('', now, 1, 'daily'),
    sitemapEntry('/tours', now, 0.9),
    sitemapEntry('/tours/compare', now, 0.7),
    sitemapEntry('/safari-updates', now, 0.8),
    sitemapEntry('/gallery', now, 0.6),
    sitemapEntry('/safari-updates/rss.xml', now, 0.4, 'daily'),
    sitemapEntry('/community-support', now, 0.8),
    sitemapEntry('/contact-us', now, 0.8),
    sitemapEntry('/request-a-quote', now, 0.9),
    sitemapEntry('/destinations', now, 0.7),
    ...CORE_PAGE_SLUGS.map((slug) => sitemapEntry(`/${slug}`, now, slug === 'about-us' ? 0.9 : 0.8)),
    ...destinations.map((item) =>
      sitemapEntry(destinationPublicPath(item.slug), now, item.slug === 'uganda' ? 0.9 : 0.85)
    ),
  ];
}

export function sitemapEntriesToXml(entries: MetadataRoute.Sitemap): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((item) => {
    const lastmod = (item.lastModified instanceof Date ? item.lastModified : new Date()).toISOString();
    return `  <url>
    <loc>${escapeXml(item.url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${item.changeFrequency || 'weekly'}</changefreq>
    <priority>${item.priority ?? 0.6}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>
`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
