import PageFavicon from '@/components/public/PageFavicon';
import { PublicDestinationsProvider } from '@/components/public/PublicDestinationsProvider';
import SiteFooter from '@/components/public/SiteFooter';
import SiteHeader from '@/components/public/SiteHeader';
import WhatsAppFloat from '@/components/public/WhatsAppFloat';
import { loadPublicNavDestinations } from '@/lib/load-public';

export default async function PublicShell({ children }: { children: React.ReactNode }) {
  const initialDestinations = await loadPublicNavDestinations();

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
