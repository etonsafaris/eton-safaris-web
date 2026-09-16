import ExplorePageClient from '@/components/public/ExplorePageClient';
import { Metadata } from 'next';

export { dynamic, revalidate } from '@/lib/public-page-config';

export const metadata: Metadata = {
  title: 'Explore Places | Eton Safaris',
  description: 'Discover amazing places and experiences across Africa with Eton Safaris. From cultural sites to natural wonders, explore the continent with expert guides.',
  alternates: {
    canonical: 'https://etonsafaris.com/explore',
  },
};

export default function ExplorePage() {
  return <ExplorePageClient initialPlaces={[]} initialTotal={0} />;
}
