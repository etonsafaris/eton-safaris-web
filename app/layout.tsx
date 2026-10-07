import type { Metadata, Viewport } from 'next';
import './globals.css';
import SiteMonitoring from '@/components/monitoring/SiteMonitoring';
import CmsLiveHost from '@/components/public/CmsLiveHost';
import PublicAppRoot from '@/components/public/PublicAppRoot';
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
    images: [{ url: `${SITE.url}${SITE_LOGO}`, width: 1024, height: 1024, alt: `${SITE.name} Logo` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} | ${SITE.tagline}`,
    images: [`${SITE.url}${SITE_LOGO}`],
  },
  icons: {
    icon: [
      { url: SITE_LOGO, type: 'image/png', sizes: '48x48' },
      { url: SITE_LOGO, type: 'image/png', sizes: '192x192' },
      { url: SITE_LOGO, type: 'image/png', sizes: '1024x1024' },
    ],
    apple: [{ url: SITE_LOGO, type: 'image/png', sizes: '180x180' }],
    shortcut: SITE_LOGO,
  },
  robots: { index: true, follow: true },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  alternates: {
    canonical: '/',
  },
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
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="bg-white font-sans">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_GRAPH) }} />
        <PublicAppRoot>
          <SiteMonitoring />
          <CmsLiveHost />
          {children}
        </PublicAppRoot>
      </body>
    </html>
  );
}
