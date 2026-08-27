import ParksPageClient from '@/components/public/ParksPageClient';
import { fetchCollectionPage, isPublishedRecord } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ParksPage() {
  const page = await fetchCollectionPage('national_park', ['national_parks', 'parks'], {
    limit: 48,
    offset: 0,
  }).catch(() => ({
    rows: [] as Awaited<ReturnType<typeof fetchCollectionPage>>['rows'],
    total: 0,
  }));
  return (
    <ParksPageClient
      initialParks={page.rows.filter(isPublishedRecord)}
      initialTotal={page.total}
    />
  );
}
