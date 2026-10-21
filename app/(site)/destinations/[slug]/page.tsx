import { permanentRedirect } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, isDedicatedLandingCountry, publicSlugFromInput } from '@/lib/cms-routes';
import { countryHeroTitle } from '@/lib/country-landing-copy';
import { countryHeroImage } from '@/lib/country-heroes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import type { RecordRow } from '@/lib/types';

export const revalidate = 900;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export default function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug) || publicSlugFromInput(params.slug);
  if (!slug || !isDedicatedLandingCountry(slug)) permanentRedirect('/destinations');
  const name = countryLabelFromSlug(slug) || slug;
  const shell = {
    name,
    title: countryHeroTitle(slug, name),
    slug,
    status: 'published',
  } as RecordRow;
  preloadPublicHero(countryHeroImage(slug, shell));

  return (
    <PublicShellServer>
      <CountryPageContent
        key={slug}
        slug={slug}
        country={shell}
        heroImage={countryHeroImage(slug, shell) || ''}
      />
    </PublicShellServer>
  );
}
