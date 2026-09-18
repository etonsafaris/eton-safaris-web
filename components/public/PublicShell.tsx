'use client';

import PageFavicon from '@/components/public/PageFavicon';
import { PublicDestinationsProvider } from '@/components/public/PublicDestinationsProvider';
import SiteFooter from '@/components/public/SiteFooter';
import SiteHeader from '@/components/public/SiteHeader';
import WhatsAppFloat from '@/components/public/WhatsAppFloat';
import type { PublicDestination } from '@/lib/public-destinations';

export default function PublicShell({
  children,
  initialDestinations = [],
}: {
  children: React.ReactNode;
  initialDestinations?: PublicDestination[];
}) {
  return (
    <PublicDestinationsProvider initialDestinations={initialDestinations}>
      <div className="min-h-screen bg-white">
        <PageFavicon />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <WhatsAppFloat />
      </div>
    </PublicDestinationsProvider>
  );
}
