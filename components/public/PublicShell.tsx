'use client';

import PageFavicon from '@/components/public/PageFavicon';
import { PublicDestinationsProvider } from '@/components/public/PublicDestinationsProvider';
import SiteFooter from '@/components/public/SiteFooter';
import SiteHeader from '@/components/public/SiteHeader';
import WhatsAppFloat from '@/components/public/WhatsAppFloat';
import { mergePublicDestinations, type PublicDestination } from '@/lib/public-destinations';

export default function PublicShell({
  children,
  initialDestinations = [],
}: {
  children: React.ReactNode;
  initialDestinations?: PublicDestination[];
}) {
  const navDestinations =
    initialDestinations.length > 0 ? initialDestinations : mergePublicDestinations([]);

  return (
    <PublicDestinationsProvider initialDestinations={navDestinations}>
      <div className="min-h-screen bg-white">
        <PageFavicon />
        <SiteHeader />
        <main className="public-shell-main">{children}</main>
        <SiteFooter />
        <WhatsAppFloat />
      </div>
    </PublicDestinationsProvider>
  );
}
