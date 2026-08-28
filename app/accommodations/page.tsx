import AccommodationsPageClient from '@/components/public/AccommodationsPageClient';
import { loadAccommodationsPageData } from '@/lib/load-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export default async function AccommodationsPage() {
  const { rows, total } = await loadAccommodationsPageData();
  return <AccommodationsPageClient initialRows={rows} initialTotal={total} />;
}
