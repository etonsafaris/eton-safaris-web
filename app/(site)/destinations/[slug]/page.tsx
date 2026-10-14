import { permanentRedirect } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, isDedicatedLandingCountry, publicSlugFromInput } from '@/lib/cms-routes';
import { countryHeroTitle } from '@/lib/country-landing-copy';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadPublicHeroImage, loadStaticDestinationParams } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';
import type { RecordRow } from '@/lib/types';

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

export default async function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug) || publicSlugFromInput(params.slug);
  if (!slug || !isDedicatedLandingCountry(slug)) permanentRedirect('/destinations');

  const name = countryLabelFromSlug(slug) || slug;
  const country = {
    name,
    title: countryHeroTitle(slug, name),
    slug,
    status: 'published',
  } as RecordRow;
  let heroImage = '';
  try {
    heroImage = await loadPublicHeroImage('countries', slug);
  } catch (error) {
    rethrowDynamicServerError(error);
  }
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <CountryPageContent key={slug} slug={slug} country={country} heroImage={heroImage} />
    </PublicShellServer>
  );
}
