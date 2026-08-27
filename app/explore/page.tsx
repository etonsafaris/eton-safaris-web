import ExplorePageClient from '@/components/public/ExplorePageClient';

export const revalidate = 60;

export default function ExplorePage() {
  return <ExplorePageClient initialPlaces={[]} initialTotal={0} />;
}
