import type { Metadata, Viewport } from 'next';
import './globals.css';
import CmsLiveHost from '@/components/public/CmsLiveHost';
import SiteTranslateRoot from '@/components/public/SiteTranslateRoot';
import { SOCIAL_LINKS, SITE, SITE_LOGO } from '@/lib/collections';

/**
 * System font stacks — Google Fonts were aborting/timing out and blocking every
 * Next.js page compile (Roboto / Inter / Merriweather / IM Fell DW Pica).
 * CSS still maps --font-* to sensible local fallbacks.
 */
const FONT_VARS =
  '[--font-sans:system-ui,-apple-system,Roboto,"Helvetica Neue",sans-serif] [--font-serif:Georgia,"Times New Roman",serif] [--font-merry:Merriweather,Georgia,serif] [--font-ui:Inter,system-ui,sans-serif]';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#00A651',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description:
    'Premier gorilla trekking, wildlife safaris, and tailor-made luxury expeditions across Uganda, Kenya, Tanzania, Rwanda, and beyond.',
  keywords: [
    'Uganda safari',
    'gorilla trekking',
    'Kenya safari',
    'Tanzania safari',
    'Rwanda gorilla trekking',
    'Eton Safaris',
  ],
  applicationName: SITE.name,
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} | ${SITE.tagline}`,
    description:
      'Premier gorilla trekking, wildlife safaris, and tailor-made luxury expeditions across East Africa.',
    url: SITE.url,
    images: [{ url: SITE_LOGO }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} | ${SITE.tagline}`,
    images: [SITE_LOGO],
  },
  icons: {
    icon: [
      { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSI1MCUiIGN5PSI0MiUiIHI9IjU4JSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzJhMmEyYSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzBkMGQwZCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjMyIiBjeT0iMzQiIHI9IjI4IiBmaWxsPSJ1cmwoI2cpIi8+PGVsbGlwc2UgY3g9IjMyIiBjeT0iMjIiIHJ4PSIyMiIgcnk9IjEwIiBmaWxsPSIjMWExYTFhIi8+PGNpcmNsZSBjeD0iMTQiIGN5PSIxOCIgcj0iNiIgZmlsbD0iIzFhMWExYSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMTgiIHI9IjYiIGZpbGw9IiMxYTFhMWEiLz48Y2lyY2xlIGN4PSIxNCIgY3k9IjE4IiByPSIzIiBmaWxsPSIjM2QyYjFmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIxOCIgcj0iMyIgZmlsbD0iIzNkMmIxZiIvPjxlbGxpcHNlIGN4PSIzMiIgY3k9IjQwIiByeD0iMTYiIHJ5PSIxNCIgZmlsbD0iIzNkMmIxZiIvPjxlbGxpcHNlIGN4PSIyNCIgY3k9IjM2IiByeD0iMy41IiByeT0iNC41IiBmaWxsPSIjZmZmIi8+PGVsbGlwc2UgY3g9IjQwIiBjeT0iMzYiIHJ4PSIzLjUiIHJ5PSI0LjUiIGZpbGw9IiNmZmYiLz48ZWxsaXBzZSBjeD0iMjQuNSIgY3k9IjM3IiByeD0iMiIgcnk9IjIuOCIgZmlsbD0iIzAwQTY1MSIvPjxlbGxpcHNlIGN4PSI0MC41IiBjeT0iMzciIHJ4PSIyIiByeT0iMi44IiBmaWxsPSIjMDBBNjUxIi8+PGNpcmNsZSBjeD0iMjQiIGN5PSIzNS41IiByPSIwLjkiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjM1LjUiIHI9IjAuOSIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yNCA0NyBRMzIgNTQgNDAgNDciIHN0cm9rZT0iIzFhMWExYSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjxlbGxpcHNlIGN4PSIzMiIgY3k9IjQ0IiByeD0iMyIgcnk9IjIiIGZpbGw9IiMxYTFhMWEiLz48L3N2Zz4=', type: 'image/svg+xml', sizes: 'any' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  robots: { index: true, follow: true },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

const SITE_GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TravelAgency',
      name: SITE.name,
      url: SITE.url,
      email: SITE.email,
      telephone: SITE.phoneDisplay,
      image: `${SITE.url}/eton-safaris-gorilla.png`,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE.url}/eton-safaris-gorilla.png`,
        width: 1024,
        height: 1024,
      },
      sameAs: Object.values(SOCIAL_LINKS),
      priceRange: '$$',
      openingHours: 'Mo-Su 08:00-20:00',
      knowsAbout: [
        'Gorilla trekking',
        'Uganda safari',
        'Kenya safari',
        'Tanzania safari',
        'Rwanda gorilla trekking',
        'Chimpanzee tracking',
        'Wildebeest migration',
      ],
      areaServed: [
        { '@type': 'Country', name: 'Uganda' },
        { '@type': 'Country', name: 'Kenya' },
        { '@type': 'Country', name: 'Tanzania' },
        { '@type': 'Country', name: 'Rwanda' },
      ],
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Wakiso District',
        addressLocality: 'Wakiso',
        addressRegion: 'Central Region',
        addressCountry: 'UG',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 0.3476,
        longitude: 32.5825,
      },
    },
    {
      '@type': 'WebSite',
      name: SITE.name,
      url: SITE.url,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE.url}/tours?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={FONT_VARS}>
      <head>
        <link rel="icon" type="image/svg+xml" sizes="any" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSI1MCUiIGN5PSI0MiUiIHI9IjU4JSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzJhMmEyYSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzBkMGQwZCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjMyIiBjeT0iMzQiIHI9IjI4IiBmaWxsPSJ1cmwoI2cpIi8+PGVsbGlwc2UgY3g9IjMyIiBjeT0iMjIiIHJ4PSIyMiIgcnk9IjEwIiBmaWxsPSIjMWExYTFhIi8+PGNpcmNsZSBjeD0iMTQiIGN5PSIxOCIgcj0iNiIgZmlsbD0iIzFhMWExYSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMTgiIHI9IjYiIGZpbGw9IiMxYTFhMWEiLz48Y2lyY2xlIGN4PSIxNCIgY3k9IjE4IiByPSIzIiBmaWxsPSIjM2QyYjFmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIxOCIgcj0iMyIgZmlsbD0iIzNkMmIxZiIvPjxlbGxpcHNlIGN4PSIzMiIgY3k9IjQwIiByeD0iMTYiIHJ5PSIxNCIgZmlsbD0iIzNkMmIxZiIvPjxlbGxpcHNlIGN4PSIyNCIgY3k9IjM2IiByeD0iMy41IiByeT0iNC41IiBmaWxsPSIjZmZmIi8+PGVsbGlwc2UgY3g9IjQwIiBjeT0iMzYiIHJ4PSIzLjUiIHJ5PSI0LjUiIGZpbGw9IiNmZmYiLz48ZWxsaXBzZSBjeD0iMjQuNSIgY3k9IjM3IiByeD0iMiIgcnk9IjIuOCIgZmlsbD0iIzAwQTY1MSIvPjxlbGxpcHNlIGN4PSI0MC41IiBjeT0iMzciIHJ4PSIyIiByeT0iMi44IiBmaWxsPSIjMDBBNjUxIi8+PGNpcmNsZSBjeD0iMjQiIGN5PSIzNS41IiByPSIwLjkiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjM1LjUiIHI9IjAuOSIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yNCA0NyBRMzIgNTQgNDAgNDciIHN0cm9rZT0iIzFhMWExYSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjxlbGxpcHNlIGN4PSIzMiIgY3k9IjQ0IiByeD0iMyIgcnk9IjIiIGZpbGw9IiMxYTFhMWEiLz48L3N2Zz4=" />
      </head>
      <body className="bg-white font-sans">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_GRAPH) }} />
        <SiteTranslateRoot>
          <CmsLiveHost />
          {children}
        </SiteTranslateRoot>
      </body>
    </html>
  );
}
