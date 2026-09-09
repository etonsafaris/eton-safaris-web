import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Safari Accommodations | Eton Safaris',
  description: 'Browse detailed information about safari lodges, camps, and hotels across East Africa.',
  alternates: {
    canonical: 'https://etonsafaris.com/accommodations',
  },
};

export default function AccommodationDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
