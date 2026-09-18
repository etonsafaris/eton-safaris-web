import PublicShellServer from '@/components/public/PublicShellServer';
import ToursPageClient from '@/components/public/ToursPageClient';
import { loadToursPageData } from '@/lib/load-public';
import { Metadata } from 'next';

export const revalidate = 900;
export const dynamicParams = true;

export const metadata: Metadata = {
  title: 'Safari Tours',
  description: 'Browse our complete collection of gorilla trekking and wildlife safari tours across Uganda, Kenya, Tanzania, and Rwanda. Find your perfect African adventure.',
  alternates: {
    canonical: 'https://etonsafaris.com/tours',
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
  const { tours, total, categories, countries } = await loadToursPageData();
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
