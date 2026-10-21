import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/destinations',
          '/tours',
          '/parks',
          '/accommodations',
          '/explore',
          '/safari-updates',
          '/gallery',
          '/cms-media/',
          '/api/media/',
          '/api/public/sitemap',
          '/eton-safaris-gorilla.png',
        ],
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
      {
        userAgent: 'Googlebot',
        allow: ['/', '/destinations', '/tours', '/parks', '/accommodations', '/explore', '/safari-updates', '/cms-media/', '/api/media/'],
        disallow: ['/admin', '/login', '/dashboard', '/payment', '/invite', '/quote'],
      },
    ],
    // Primary + crash-proof fallbacks so Google always has a working map.
    sitemap: [
      'https://etonsafaris.com/sitemap.xml',
      'https://etonsafaris.com/api/public/sitemap',
      'https://etonsafaris.com/sitemap-core.xml',
    ],
    host: 'https://etonsafaris.com',
  };
}
