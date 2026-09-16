import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/landing',
          '/login',
          '/agents/register',
          '/agents/portal',
          '/dashboard',
          '/quote',
          '/invite',
          '/verify',
          '/payment',
          '/api/',
        ],
        allow: ['/cms-media/', '/api/media/'],
      },
    ],
    sitemap: 'https://etonsafaris.com/sitemap.xml',
    host: 'https://etonsafaris.com',
  };
}
