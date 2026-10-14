import PublicShellServer from '@/components/public/PublicShellServer';
import ToursPageClient from '@/components/public/ToursPageClient';
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

export default function ToursPage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string; destination?: string; days?: string; depart?: string; page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  return (
    <PublicShellServer>
    <ToursPageClient
      initialTours={[]}
      initialCategories={[]}
      initialCountries={[]}
      initialTotal={0}
      page={page}
      pageSize={PAGE_SIZE}
      initialQuery={param(searchParams?.q)}
      initialCategory={param(searchParams?.category)}
      initialDestination={param(searchParams?.destination)}
      initialDays={param(searchParams?.days)}
      initialDepart={param(searchParams?.depart)}
    />
    </PublicShellServer>
  );
}
