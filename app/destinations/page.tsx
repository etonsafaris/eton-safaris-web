import DestinationsIndexClient from '@/components/public/DestinationsIndexClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadDestinationsIndexCountries } from '@/lib/load-public';
import { Metadata } from 'next';

export { revalidate } from '@/lib/public-page-config';

export const metadata: Metadata = {
  title: 'Safari Destinations | Eton Safaris',
  description: 'Explore our African safari destinations including Uganda, Kenya, Tanzania, and Rwanda. Discover gorilla trekking, wildlife, and cultural experiences.',
  alternates: {
    canonical: 'https://etonsafaris.com/destinations',
  },
};

export default async function DestinationsIndexPage() {
  let countries: Awaited<ReturnType<typeof loadDestinationsIndexCountries>> = [];
  try {
    countries = await loadDestinationsIndexCountries();
  } catch (error) {
    console.warn('[Public] Destinations index failed:', error);
  }
  return (
    <PublicShellServer>
      <DestinationsIndexClient initialCountries={countries} />
    </PublicShellServer>
  );
}
