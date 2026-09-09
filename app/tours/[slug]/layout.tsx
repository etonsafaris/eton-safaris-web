import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Safari Tours | Eton Safaris',
  description: 'Explore our detailed safari tour packages for gorilla trekking, wildlife viewing, and adventure experiences across East Africa.',
  alternates: {
    canonical: 'https://etonsafaris.com/tours',
  },
};

export default function TourDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
