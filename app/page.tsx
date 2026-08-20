import HomePageClient from '@/components/public/HomePageClient';
import { loadHomePageData } from '@/lib/load-public';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function HomePage() {
  const data = await loadHomePageData();
  return (
    <HomePageClient
      initialCountries={data.countries}
      initialTours={data.tours}
      initialUpdates={data.updates}
      initialParks={data.parks}
      initialCategories={data.categories}
    />
  );
}
