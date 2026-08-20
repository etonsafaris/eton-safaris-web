import AccommodationsPageClient from '@/components/public/AccommodationsPageClient';
import { loadPublishedRecords } from '@/lib/load-public';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccommodationsPage() {
  const rows = await loadPublishedRecords('accommodations');
  return <AccommodationsPageClient initialRows={rows} />;
}
