import DestinationsIndexClient from '@/components/public/DestinationsIndexClient';
import { loadPublishedRecords } from '@/lib/load-public';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function DestinationsIndexPage() {
  const countries = await loadPublishedRecords('countries');
  return <DestinationsIndexClient initialCountries={countries} />;
}
