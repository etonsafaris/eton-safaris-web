import ToursPageClient from '@/components/public/ToursPageClient';
import { loadPublishedRecords } from '@/lib/load-public';
import { publicListColumnsFor, TOUR_LIST_COLUMNS, fetchCollectionRecords } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ToursPage() {
  const categoryCols = publicListColumnsFor('categories');
  const [tours, categories, countries] = await Promise.all([
    loadPublishedRecords('tours', [], { columns: TOUR_LIST_COLUMNS }),
    fetchCollectionRecords('categories', [], categoryCols ? { columns: categoryCols } : undefined).catch(
      () => []
    ),
    loadPublishedRecords('countries'),
  ]);
  return (
    <ToursPageClient initialTours={tours} initialCategories={categories} initialCountries={countries} />
  );
}
