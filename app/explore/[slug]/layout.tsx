import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Explore Places | Eton Safaris',
  description: 'Discover amazing places and destinations across East Africa with Eton Safaris.',
  alternates: {
    canonical: 'https://etonsafaris.com/explore',
  },
};

export default function ExploreDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
