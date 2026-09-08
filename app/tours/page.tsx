import ToursPageClient from '@/components/public/ToursPageClient';
import { loadToursPageData } from '@/lib/load-public';
import { Metadata } from 'next';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export const metadata: Metadata = {
  title: 'Safari Tours | Eton Safaris',
  description: 'Browse our complete collection of gorilla trekking and wildlife safari tours across Uganda, Kenya, Tanzania, and Rwanda. Find your perfect African adventure.',
  alternates: {
    canonical: 'https://etonsafaris.com/tours',
  },
};

export default async function ToursPage() {
  const { tours, total, categories, countries } = await loadToursPageData();
  return (
    <ToursPageClient
      initialTours={tours}
      initialCategories={categories}
      initialCountries={countries}
      initialTotal={total}
    />
  );
}
