import AccommodationsPageClient from '@/components/public/AccommodationsPageClient';
import { loadAccommodationsPageData } from '@/lib/load-public';

export const revalidate = 60;

export default async function AccommodationsPage() {
  const { rows, total } = await loadAccommodationsPageData();
  return <AccommodationsPageClient initialRows={rows} initialTotal={total} />;
}
