import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Payment Portal | Eton Safaris',
  description: 'Secure payment portal for Eton Safaris safari bookings. Pay for your gorilla trekking and wildlife safari tours safely via Pesapal.',
  alternates: {
    canonical: 'https://etonsafaris.com/payment',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
