import ExplorePageClient from '@/components/public/ExplorePageClient';
import { loadPublishedRecords } from '@/lib/load-public';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExplorePage() {
  const places = await loadPublishedRecords('explore');
  return <ExplorePageClient initialPlaces={places} />;
}
