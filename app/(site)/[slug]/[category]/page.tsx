import { permanentRedirect } from 'next/navigation';
import CategoryPageContent from '@/components/public/CategoryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, resolvePublicSlug, titleFromPublicSlug } from '@/lib/cms-routes';
import { countryHeroTitle } from '@/lib/country-landing-copy';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadStaticCategoryParams } from '@/lib/load-public';
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

export default function CountryCategoryPage({ params }: PageProps) {
  if (isReservedPublicSlug(params.slug)) permanentRedirect('/destinations');
  const resolved = resolvePublicSlug(params.slug);
  const countrySlug = resolved?.countrySlug || countrySlugFromLanding(params.slug) || params.slug;
  const countryName = countryLabelFromSlug(countrySlug) || titleFromPublicSlug(countrySlug);
  const country = {
    name: countryName,
    title: countryHeroTitle(countrySlug, countryName),
    slug: countrySlug,
  } as RecordRow;

  return (
    <PublicShellServer>
      <CategoryPageContent slug={countrySlug} country={country} categorySlug={params.category} />
    </PublicShellServer>
  );
}
