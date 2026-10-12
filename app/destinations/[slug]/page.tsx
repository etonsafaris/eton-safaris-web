import { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { permanentRedirect } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, destinationPublicPath, publicSlugFromInput } from '@/lib/cms-routes';
import { isCountryPageShellCountry } from '@/lib/country-heroes';
import { isDedicatedLandingCountry } from '@/lib/cms-routes';
import { loadCountryPageDataResilient, loadStaticDestinationParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

/** Edge ISR + on-demand revalidate from admin; slugs pre-built at deploy. */
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
  if (!slug || !isDedicatedLandingCountry(slug)) permanentRedirect('/destinations');

  let data;
  try {
    data = await loadCountryPageDataResilient(slug);
  } catch (error) {
    console.warn('[Public] Destination page load failed:', slug, error);
    permanentRedirect('/destinations');
  }
  if (!data?.country) permanentRedirect('/destinations');

  const country = data.country;
  if (isCountryPageShellCountry(country) || !data.tours?.length) noStore();
  return (
    <>
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
