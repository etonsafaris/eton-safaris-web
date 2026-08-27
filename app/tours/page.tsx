import ToursPageClient from '@/components/public/ToursPageClient';

export const revalidate = 60;

/** Avoid server-side tour/count queries — they were 500/504 on Vercel. */
export default function ToursPage() {
  return (
    <ToursPageClient
      initialTours={[]}
      initialCategories={[]}
      initialCountries={[]}
      initialTotal={0}
    />
  );
}
