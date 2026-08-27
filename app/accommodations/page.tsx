import AccommodationsPageClient from '@/components/public/AccommodationsPageClient';
import { fetchCollectionPage, isPublishedRecord } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccommodationsPage() {
  const page = await fetchCollectionPage('accommodations', [], { limit: 48, offset: 0 }).catch(() => ({
    rows: [] as Awaited<ReturnType<typeof fetchCollectionPage>>['rows'],
    total: 0,
  }));
  return (
    <AccommodationsPageClient
      initialRows={page.rows.filter(isPublishedRecord)}
      initialTotal={page.total}
    />
  );
}
