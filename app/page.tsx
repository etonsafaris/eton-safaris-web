import HomePageClient from '@/components/public/HomePageClient';
import { loadHomePageContent, loadHomePageData } from '@/lib/load-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export default async function HomePage() {
  const [data, homeContent] = await Promise.all([loadHomePageData(), loadHomePageContent()]);
  return (
    <HomePageClient
      initialCountries={data.countries}
      initialTours={data.tours}
      initialUpdates={data.updates}
      initialParks={data.parks}
      initialCategories={data.categories}
      initialHomeContent={homeContent}
    />
  );
}
