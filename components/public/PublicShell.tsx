import SiteHeader from '@/components/public/SiteHeader';
import SiteFooter from '@/components/public/SiteFooter';
import PageFavicon from '@/components/public/PageFavicon';
import WhatsAppFloat from '@/components/public/WhatsAppFloat';

export default function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <PageFavicon />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
