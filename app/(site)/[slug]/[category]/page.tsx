import { permanentRedirect } from 'next/navigation';
import CategoryPageContent from '@/components/public/CategoryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, resolvePublicSlug, titleFromPublicSlug } from '@/lib/cms-routes';
import { countryHeroTitle } from '@/lib/country-landing-copy';
import { countryHeroImage } from '@/lib/country-heroes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { getPublicRecordImage } from '@/lib/content-image';
import { loadCategoryPageData, loadStaticCategoryParams } from '@/lib/load-public';
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
  let country = {
    name: countryName,
    title: countryHeroTitle(countrySlug, countryName),
    slug: countrySlug,
  } as RecordRow;
  let categories: RecordRow[] = [];
  let tours: RecordRow[] = [];
  let category: RecordRow | null = null;
  try {
    const loaded = await loadCategoryPageData(countrySlug, params.category);
    if (loaded.country) country = loaded.country;
    categories = loaded.categories ?? [];
    tours = loaded.tours ?? [];
    category = loaded.category ?? null;
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Category page failed:', countrySlug, params.category, error);
  }
  const heroImage =
    getPublicRecordImage(category) || countryHeroImage(countrySlug, country) || '';
  preloadPublicHero(heroImage);
  const serverPreloaded = Boolean(category || categories.length || tours.length);

  return (
    <PublicShellServer>
      <CategoryPageContent
        slug={countrySlug}
        country={country}
        categorySlug={params.category}
        heroImage={heroImage}
        initialCategories={categories}
        initialTours={tours}
        initialCategory={category}
        serverPreloaded={serverPreloaded}
      />
    </PublicShellServer>
  );
}
