import PublicShellServer from '@/components/public/PublicShellServer';
import ToursPageClient from '@/components/public/ToursPageClient';
import { loadToursPageData } from '@/lib/load-public';
import { Metadata } from 'next';

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
  searchParams?: { q?: string; category?: string; destination?: string; days?: string; depart?: string };
}) {
  let tours: Awaited<ReturnType<typeof loadToursPageData>>['tours'] = [];
  let total = 0;
  let categories: Awaited<ReturnType<typeof loadToursPageData>>['categories'] = [];
  let countries: Awaited<ReturnType<typeof loadToursPageData>>['countries'] = [];
  try {
    const loaded = await loadToursPageData();
    tours = loaded.tours ?? [];
    total = loaded.total ?? 0;
    categories = loaded.categories ?? [];
    countries = loaded.countries ?? [];
  } catch (error) {
    console.warn('[Public] Tours listing failed:', error);
  }
  return (
    <PublicShellServer>
    <ToursPageClient
      initialTours={tours}
      initialCategories={categories}
      initialCountries={countries}
      initialTotal={total}
      initialQuery={param(searchParams?.q)}
      initialCategory={param(searchParams?.category)}
      initialDestination={param(searchParams?.destination)}
      initialDays={param(searchParams?.days)}
      initialDepart={param(searchParams?.depart)}
    />
    </PublicShellServer>
  );
}
