import ParksPageClient from '@/components/public/ParksPageClient';
import { loadPublishedRecords } from '@/lib/load-public';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ParksPage() {
  const parks = await loadPublishedRecords('national_park', ['national_parks', 'parks']);
  return <ParksPageClient initialParks={parks} />;
}
