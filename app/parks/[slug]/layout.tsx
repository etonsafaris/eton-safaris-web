import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'National Parks | Eton Safaris',
  description: 'Discover detailed information about Africa\'s national parks and wildlife reserves with Eton Safaris.',
  alternates: {
    canonical: 'https://etonsafaris.com/parks',
  },
};

export default function ParkDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
