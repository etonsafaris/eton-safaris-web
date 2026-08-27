import HomePageClient from '@/components/public/HomePageClient';

export const revalidate = 60;

/** Avoid server-side Supabase on the homepage — slow CMS reads were causing Vercel 504s. */
export default function HomePage() {
  return (
    <HomePageClient
      initialCountries={[]}
      initialTours={[]}
      initialUpdates={[]}
      initialParks={[]}
      initialCategories={[]}
    />
  );
}
