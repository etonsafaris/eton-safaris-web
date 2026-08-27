import ExplorePageClient from '@/components/public/ExplorePageClient';
import { fetchCollectionPage, isPublishedRecord } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExplorePage() {
  const page = await fetchCollectionPage('explore', [], { limit: 48, offset: 0 }).catch(() => ({
    rows: [] as Awaited<ReturnType<typeof fetchCollectionPage>>['rows'],
    total: 0,
  }));
  return (
    <ExplorePageClient
      initialPlaces={page.rows.filter(isPublishedRecord)}
      initialTotal={page.total}
    />
  );
}
