import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, destinationPublicPath } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadCountryPageData, loadStaticDestinationParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

export function generateStaticParams() {
  return loadStaticDestinationParams();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = countrySlugFromLanding(params.slug);
  if (!slug) {
    return {
      title: 'Destination Not Found | Eton Safaris',
      robots: { index: false, follow: false },
    };
  }

  return publicRecordMetadata('countries', slug, destinationPublicPath(slug), { contentType: 'country' });
}

export default async function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  if (!slug) notFound();

  let data;
  try {
    data = await loadCountryPageData(slug);
  } catch (error) {
    console.error('[Destination detail] Failed to load country:', error);
    notFound();
  }
  if (!data.country) notFound();
  const country =
    data.country ||
    ({
      name: countryLabelFromSlug(slug),
      title: countryLabelFromSlug(slug),
      slug,
    } as const);

  return (
    <PublicShellServer>
      <CountryPageContent
        key={slug}
        slug={slug}
        country={country}
        initialCategories={data.categories}
        initialTours={data.tours}
        initialParks={data.parks}
        initialPlaces={data.places}
        initialStays={data.stays}
      />
    </PublicShellServer>
  );
}
