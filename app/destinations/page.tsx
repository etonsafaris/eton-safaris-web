import DestinationsIndexClient from '@/components/public/DestinationsIndexClient';
import { loadPublishedRecords } from '@/lib/load-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export default async function DestinationsIndexPage() {
  const countries = await loadPublishedRecords('countries');
  return <DestinationsIndexClient initialCountries={countries} />;
}
