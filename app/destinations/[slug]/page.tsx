import { Metadata } from 'next';
import PublicRecordUnavailable from '@/components/public/PublicRecordUnavailable';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, destinationPublicPath, publicSlugFromInput } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadCountryPageDataResilient } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export { revalidate } from '@/lib/public-page-config';
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = countrySlugFromLanding(params.slug);
  if (!slug) {
    return {
      title: 'Destination Not Found | Eton Safaris',
      robots: { index: false, follow: false },
    };
  }

  try {
    return await publicRecordMetadata('countries', slug, destinationPublicPath(slug), { contentType: 'country' });
  } catch (error) {
    console.warn('[Public] Destination metadata failed:', slug, error);
    return { title: `${slug} | Eton Safaris`, robots: { index: false, follow: false } };
  }
}

export default async function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug) || publicSlugFromInput(params.slug);
  if (!slug) {
    return (
      <PublicShellServer>
        <PublicRecordUnavailable title="Destination not found" />
      </PublicShellServer>
    );
  }

  const fallbackName = countryLabelFromSlug(slug);
  const data = await loadCountryPageDataResilient(slug);
  const country =
    data.country ||
    ({
      name: fallbackName,
      title: fallbackName,
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
      />
    </PublicShellServer>
  );
}
