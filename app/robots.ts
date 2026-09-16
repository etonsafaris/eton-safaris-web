import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/cms-media/', '/api/media/', '/eton-safaris-gorilla.png'],
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
          '/icon.png',
          '/apple-icon.png',
          '/favicon.ico',
          '/icon-192.png',
        ],
      },
    ],
    sitemap: 'https://etonsafaris.com/sitemap.xml',
    host: 'https://etonsafaris.com',
  };
}
