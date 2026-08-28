import ToursPageClient from '@/components/public/ToursPageClient';
import { loadToursPageData } from '@/lib/load-public';

export const revalidate = 60;

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
