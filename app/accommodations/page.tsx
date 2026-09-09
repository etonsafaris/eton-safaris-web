import AccommodationsPageClient from '@/components/public/AccommodationsPageClient';
import { loadAccommodationsPageData } from '@/lib/load-public';
import { Metadata } from 'next';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export const metadata: Metadata = {
  title: 'Safari Accommodations | Eton Safaris',
  description: 'Browse our curated selection of safari lodges, camps, and hotels across Uganda, Kenya, Tanzania, and Rwanda. From luxury lodges to mid-range camps.',
  alternates: {
    canonical: 'https://etonsafaris.com/accommodations',
  },
};

export default async function AccommodationsPage() {
  const { rows, total } = await loadAccommodationsPageData();
  return <AccommodationsPageClient initialRows={rows} initialTotal={total} />;
}
