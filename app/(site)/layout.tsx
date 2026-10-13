import SiteMonitoring from '@/components/monitoring/SiteMonitoring';
import CmsLiveHost from '@/components/public/CmsLiveHost';
import PublicAppRoot from '@/components/public/PublicAppRoot';

/** On-demand render. A static prerender here was turning database misses into a cached 500. */
export const dynamic = 'force-dynamic';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicAppRoot>
      <SiteMonitoring />
      <CmsLiveHost />
      {children}
    </PublicAppRoot>
  );
}
