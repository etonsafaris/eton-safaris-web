import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Safari Tours',
  robots: { index: false, follow: true },
};

export default function AccommodationsListingRedirect() {
  redirect('/tours');
}
