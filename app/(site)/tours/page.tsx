import PublicShellServer from '@/components/public/PublicShellServer';
import ToursPageClient from '@/components/public/ToursPageClient';
import { getPublicRecordImage } from '@/lib/content-image';
import { loadToursPageData } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';
import type { RecordRow } from '@/lib/types';
import { Metadata } from 'next';

const PAGE_SIZE = 24;

export { revalidate } from '@/lib/public-page-config';
export const dynamicParams = true;

export const metadata: Metadata = {
  title: 'Safari Tours',
  description: 'Browse our complete collection of gorilla trekking and wildlife safari tours across Uganda, Kenya, Tanzania, and Rwanda. Find your perfect African adventure.',
  alternates: {
    canonical: 'https://etonsafaris.com/tours',
  },
  openGraph: {
    title: 'Safari Tours | Eton Safaris',
    description:
      'Browse gorilla trekking and wildlife safari tours across Uganda, Kenya, Tanzania, and Rwanda.',
    url: 'https://etonsafaris.com/tours',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Safari Tours | Eton Safaris',
  },
};

function param(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function ToursPage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string; destination?: string; days?: string; depart?: string; page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  let tours: RecordRow[] = [];
  let categories: RecordRow[] = [];
  let countries: RecordRow[] = [];
  let total = 0;
  try {
    const loaded = await loadToursPageData({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    tours = loaded.tours ?? [];
    categories = loaded.categories ?? [];
    countries = loaded.countries ?? [];
    total = loaded.total ?? tours.length;
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Tours listing failed:', error);
  }
  const heroImage = getPublicRecordImage(tours[0]) || '';
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <ToursPageClient
        initialTours={tours}
        initialCategories={categories}
        initialCountries={countries}
        initialTotal={total}
        page={page}
        pageSize={PAGE_SIZE}
        initialQuery={param(searchParams?.q)}
        initialCategory={param(searchParams?.category)}
        initialDestination={param(searchParams?.destination)}
        initialDays={param(searchParams?.days)}
        initialDepart={param(searchParams?.depart)}
        initialHeroImage={heroImage}
      />
    </PublicShellServer>
  );
}
