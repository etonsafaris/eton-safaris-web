import HomePageClient from '@/components/public/HomePageClient';
import { loadHomePageContent, loadHomePageData } from '@/lib/load-public';
import { Metadata } from 'next';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export const metadata: Metadata = {
  title: 'Eton Safaris | Africa & Beyond',
  description: 'Premier gorilla trekking, wildlife safaris, and tailor-made luxury expeditions across Uganda, Kenya, Tanzania, Rwanda, and beyond.',
  alternates: {
    canonical: 'https://etonsafaris.com',
  },
};

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
