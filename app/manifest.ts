import type { MetadataRoute } from 'next';
import { SITE_LOGO } from '@/lib/collections';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Eton Safaris',
    short_name: 'Eton Safaris',
    description: 'Gorilla trekking and wildlife safaris across Africa.',
    start_url: '/',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#00A651',
    icons: [
      {
        src: SITE_LOGO,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  };
}
