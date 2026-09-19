import HomePageClient from '@/components/public/HomePageClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { loadHomePageContent, loadHomePageData } from '@/lib/load-public';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import { Metadata } from 'next';

export { revalidate } from '@/lib/public-page-config';

export const metadata: Metadata = {
  title: {
    absolute: 'Eton Safaris | Africa & Beyond',
  },
  description:
    'Premier gorilla trekking, wildlife safaris, and tailor-made luxury expeditions across Uganda, Kenya, Tanzania, Rwanda, and beyond.',
  alternates: {
    canonical: publicCanonicalUrl('/'),
  },
  robots: { index: true, follow: true },
};

export default async function HomePage() {
  let data = {
    countries: [] as Awaited<ReturnType<typeof loadHomePageData>>['countries'],
    tours: [] as Awaited<ReturnType<typeof loadHomePageData>>['tours'],
    updates: [] as Awaited<ReturnType<typeof loadHomePageData>>['updates'],
    categories: [] as Awaited<ReturnType<typeof loadHomePageData>>['categories'],
  };
  let homeContent: Awaited<ReturnType<typeof loadHomePageContent>> = null;
  try {
    const [loaded, content] = await Promise.all([loadHomePageData(), loadHomePageContent()]);
    data = loaded;
    homeContent = content;
  } catch (error) {
    console.error('[Public] Home page data failed:', error);
  }
  const initialHeroSlides = buildHomeHeroSlides();

  return (
    <PublicShellServer>
      <HomePageClient
        initialHeroSlides={initialHeroSlides}
        initialCountries={data.countries}
        initialTours={data.tours}
        initialUpdates={data.updates}
        initialCategories={data.categories}
        initialHomeContent={homeContent}
      />
    </PublicShellServer>
  );
}
