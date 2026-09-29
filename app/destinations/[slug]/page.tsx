import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, destinationPublicPath, publicSlugFromInput } from '@/lib/cms-routes';
import { countryHeroImage } from '@/lib/country-heroes';
import { isDedicatedLandingCountry } from '@/lib/cms-routes';
import { loadCountryPageDataResilient, loadStaticDestinationParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

/** Admin-synced destination detail — Aiven visibility guard + 60s ISR. */
export const revalidate = 60;
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
  if (!slug || !isDedicatedLandingCountry(slug)) notFound();

  const data = await loadCountryPageDataResilient(slug);
  if (!data?.country) notFound();

  const country = data.country;
  const heroSrc = countryHeroImage(slug, country);

  return (
    <>
      {heroSrc ? <link rel="preload" as="image" href={heroSrc} fetchPriority="high" /> : null}
      <PublicShellServer>
        <CountryPageContent
          key={slug}
          slug={slug}
          country={country}
          initialCategories={Array.isArray(data.categories) ? data.categories : []}
          initialTours={Array.isArray(data.tours) ? data.tours : []}
          initialParks={Array.isArray(data.parks) ? data.parks : []}
          initialPlaces={Array.isArray(data.places) ? data.places : []}
        />
      </PublicShellServer>
    </>
  );
}
