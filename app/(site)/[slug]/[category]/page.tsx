import { permanentRedirect } from 'next/navigation';
import CategoryPageContent from '@/components/public/CategoryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, resolvePublicSlug, titleFromPublicSlug } from '@/lib/cms-routes';
import { countryHeroTitle } from '@/lib/country-landing-copy';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadPublicHeroImage, loadStaticCategoryParams } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';
import type { RecordRow } from '@/lib/types';

type PageProps = {
  params: { slug: string; category: string };
};

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  return loadStaticCategoryParams();
}

function isReservedPublicSlug(slug: string): boolean {
  return slug.toLowerCase() === 'api';
}

export function generateMetadata({ params }: PageProps) {
  if (isReservedPublicSlug(params.slug)) {
    return { title: 'Eton Safaris', robots: { index: false, follow: false } };
  }
  const countrySlug = countrySlugFromLanding(params.slug) || params.slug;
  const countryName = countryLabelFromSlug(countrySlug) || titleFromPublicSlug(countrySlug);
  return { title: `${titleFromPublicSlug(params.category)} in ${countryName}` };
}

export default async function CountryCategoryPage({ params }: PageProps) {
  if (isReservedPublicSlug(params.slug)) permanentRedirect('/destinations');
  const resolved = resolvePublicSlug(params.slug);
  const countrySlug = resolved?.countrySlug || countrySlugFromLanding(params.slug) || params.slug;
  const countryName = countryLabelFromSlug(countrySlug) || titleFromPublicSlug(countrySlug);
  const country = {
    name: countryName,
    title: countryHeroTitle(countrySlug, countryName),
    slug: countrySlug,
  } as RecordRow;
  let heroImage = '';
  try {
    heroImage =
      (await loadPublicHeroImage('categories', params.category)) ||
      (await loadPublicHeroImage('countries', countrySlug));
  } catch (error) {
    rethrowDynamicServerError(error);
  }
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <CategoryPageContent slug={countrySlug} country={country} categorySlug={params.category} heroImage={heroImage} />
    </PublicShellServer>
  );
}
