import SiteMonitoring from '@/components/monitoring/SiteMonitoring';
import CmsLiveHost from '@/components/public/CmsLiveHost';
import PublicAppRoot from '@/components/public/PublicAppRoot';
/**
 * ISR for the public shell so Home / Destinations soft-navigations stay warm.
 * Pages that must always hit the DB set their own dynamic / revalidate.
 */
export const revalidate = 900;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicAppRoot>
      <SiteMonitoring />
      <CmsLiveHost />
      {children}
    </PublicAppRoot>
  );
}
