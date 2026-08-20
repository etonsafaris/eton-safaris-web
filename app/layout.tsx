import type { Metadata, Viewport } from 'next';
import { IM_Fell_DW_Pica, Inter, Merriweather, Roboto } from 'next/font/google';
import './globals.css';
import CmsLiveHost from '@/components/public/CmsLiveHost';
import { SOCIAL_LINKS, SITE, SITE_LOGO } from '@/lib/collections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: true,
  variable: '--font-sans',
  adjustFontFallback: true,
});

const imFell = IM_Fell_DW_Pica({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  preload: true,
  variable: '--font-serif',
  adjustFontFallback: false,
});

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
  variable: '--font-merry',
  adjustFontFallback: true,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-ui',
  adjustFontFallback: true,
});

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
    icon: [{ url: SITE_LOGO, type: 'image/png' }],
    apple: SITE_LOGO,
    shortcut: SITE_LOGO,
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
      image: `${SITE.url}${SITE_LOGO}`,
      logo: `${SITE.url}${SITE_LOGO}`,
      sameAs: Object.values(SOCIAL_LINKS),
      areaServed: ['UG', 'KE', 'TZ', 'RW'],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Wakiso District',
        addressCountry: 'UG',
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
    <html lang="en" className={`${roboto.variable} ${imFell.variable} ${merriweather.variable} ${inter.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_GRAPH) }} />
      </head>
      <body className={roboto.className}>
        <CmsLiveHost />
        {children}
      </body>
    </html>
  );
}
