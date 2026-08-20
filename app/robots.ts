import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/landing', '/login', '/agents/register', '/agents/portal', '/dashboard', '/quote'],
      },
    ],
    sitemap: ['https://etonsafaris.com/sitemap.xml', 'https://etonsafaris.com/safari-updates/rss.xml'],
    host: 'https://etonsafaris.com',
  };
}
