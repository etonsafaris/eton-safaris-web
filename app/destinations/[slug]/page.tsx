import { Metadata } from 'next';
import PublicRecordUnavailable from '@/components/public/PublicRecordUnavailable';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, destinationPublicPath, publicSlugFromInput } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { countryHeroImage } from '@/lib/country-heroes';
import { loadCountryPageDataResilient, loadStaticDestinationParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    return await loadStaticDestinationParams();
  } catch (error) {
    console.warn('[Public] Destination static params failed:', error);
    return [];
  }
}

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
      status: 'published',
    } as const);
  const heroSrc = countryHeroImage(slug, country);

  return (
    <>
      {heroSrc ? <link rel="preload" as="image" href={heroSrc} fetchPriority="high" /> : null}
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
    </>
  );
}
