import ToursPageClient from '@/components/public/ToursPageClient';
import { loadPublishedRecords } from '@/lib/load-public';
import { publicListColumnsFor, TOUR_LIST_COLUMNS, countCollectionRecords, fetchCollectionPage } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ToursPage() {
  const categoryCols = publicListColumnsFor('categories');
  const [tourPage, categories, countries, tourTotal] = await Promise.all([
    fetchCollectionPage('tours', [], { columns: TOUR_LIST_COLUMNS, limit: 48, offset: 0 }),
    loadPublishedRecords('categories', [], categoryCols ? { columns: categoryCols } : undefined),
    loadPublishedRecords('countries'),
    countCollectionRecords('tours').catch(() => 0),
  ]);
  return (
    <ToursPageClient
      initialTours={tourPage.rows}
      initialCategories={categories}
      initialCountries={countries}
      initialTotal={tourTotal || tourPage.total}
    />
  );
}
