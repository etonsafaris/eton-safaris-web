import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Verify Booking | Eton Safaris',
  description: 'Verify your Eton Safaris booking status and payment details using your booking code or payment reference.',
  alternates: {
    canonical: 'https://etonsafaris.com/verify',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
