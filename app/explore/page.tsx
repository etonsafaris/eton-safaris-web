import ExplorePageClient from '@/components/public/ExplorePageClient';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export default function ExplorePage() {
  return <ExplorePageClient initialPlaces={[]} initialTotal={0} />;
}
