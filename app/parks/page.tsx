import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Safari Tours',
  robots: { index: false, follow: true },
};

/** Parks are discoverable via search and Google — not a public browse hub. */
export default function ParksListingRedirect() {
  redirect('/tours');
}
