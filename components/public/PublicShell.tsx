'use client';

import PageFavicon from '@/components/public/PageFavicon';
import { PublicDestinationsProvider } from '@/components/public/PublicDestinationsProvider';
import SiteFooter from '@/components/public/SiteFooter';
import SiteHeader from '@/components/public/SiteHeader';
import PublicNavPrefetch from '@/components/public/PublicNavPrefetch';
import WhatsAppFloat from '@/components/public/WhatsAppFloat';
import type { HomePageContent } from '@/lib/home-page-content';
import { mergePublicDestinations, type PublicDestination } from '@/lib/public-destinations';

export default function PublicShell({
  children,
  initialDestinations = [],
  initialHome = null,
}: {
  children: React.ReactNode;
  initialDestinations?: PublicDestination[];
  initialHome?: HomePageContent | null;
}) {
  const navDestinations =
    initialDestinations.length > 0 ? initialDestinations : mergePublicDestinations([]);

  return (
    <PublicDestinationsProvider initialDestinations={navDestinations}>
      <div className="min-h-screen bg-white">
        <PageFavicon />
        <PublicNavPrefetch />
        <SiteHeader />
        <main className="public-shell-main">{children}</main>
        <SiteFooter initialHome={initialHome} />
        <WhatsAppFloat initialHome={initialHome} />
      </div>
    </PublicDestinationsProvider>
  );
}
