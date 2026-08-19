import dynamic from 'next/dynamic';
import SiteHeader from '@/components/public/SiteHeader';
import SiteFooter from '@/components/public/SiteFooter';
import PageFavicon from '@/components/public/PageFavicon';

const WhatsAppFloat = dynamic(() => import('@/components/public/WhatsAppFloat'), {
  ssr: false,
});

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
