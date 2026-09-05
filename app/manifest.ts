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
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
