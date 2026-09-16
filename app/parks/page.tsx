import ParksPageClient from '@/components/public/ParksPageClient';
import { Metadata } from 'next';

export { dynamic, revalidate } from '@/lib/public-page-config';

export const metadata: Metadata = {
  title: 'National Parks | Eton Safaris',
  description: 'Explore Africa\'s national parks and wildlife reserves with Eton Safaris. From Bwindi Impenetrable Forest to Serengeti, discover the best safari destinations.',
  alternates: {
    canonical: 'https://etonsafaris.com/parks',
  },
};

/** Avoid server-side park list queries — exact counts were timing out on Vercel. */
export default function ParksPage() {
  return <ParksPageClient initialParks={[]} initialTotal={0} />;
}
