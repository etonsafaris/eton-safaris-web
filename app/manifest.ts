import type { MetadataRoute } from 'next';

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
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
