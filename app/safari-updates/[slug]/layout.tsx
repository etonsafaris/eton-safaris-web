import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Safari Updates | Eton Safaris',
  description: 'Stay updated with the latest safari news, travel tips, and wildlife conservation updates from Eton Safaris.',
  alternates: {
    canonical: 'https://etonsafaris.com/safari-updates',
  },
};

export default function SafariUpdateDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
