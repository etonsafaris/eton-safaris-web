import type { Metadata } from 'next';
import { permanentRedirect, redirect } from 'next/navigation';
import CategoryPageContent from '@/components/public/CategoryPageContent';
import JsonLd from '@/components/public/JsonLd';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, destinationPublicPath, landingSlugForCountry, resolvePublicSlug } from '@/lib/cms-routes';
import { findCategoryBySlug } from '@/lib/country-utils';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { loadCategoryPageData, loadStaticCategoryParams } from '@/lib/load-public';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo } from '@/lib/seo-public';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (isReservedPublicSlug(params.slug)) {
    return { title: 'Eton Safaris', robots: { index: false, follow: false } };
  }
  const path = `/${params.slug}/${params.category}`;
  const resolved = resolvePublicSlug(params.slug);
  const countryKey = resolved?.countrySlug || countrySlugFromLanding(params.slug) || params.slug;
  try {
    const categories = await fetchCollectionRecords('categories');
    const category = findCategoryBySlug(categories, params.category, countryKey);
    const row = category;
    const values = seoValuesFromRecord((row || {}) as Record<string, unknown>);
    const title = values.seo_title || (row && getRecordTitle(row)) || params.category;
    const description =
      values.meta_description || (row && pickString(row, ['description', 'content', 'summary'])) || undefined;
    return metadataFromSeo(values, {
      title,
      description: description?.replace(/<[^>]+>/g, ' ').slice(0, 160),
      path,
      image: (row && getRecordImage(row)) || undefined,
    });
  } catch {
    return { title: params.category };
  }
}

export default async function CountryCategoryPage({ params }: PageProps) {
  if (isReservedPublicSlug(params.slug)) permanentRedirect('/destinations');
  const resolved = resolvePublicSlug(params.slug);
  const countrySlug = resolved?.countrySlug || countrySlugFromLanding(params.slug) || params.slug;
  const landingSlug = params.slug.includes('-safaris') ? params.slug : landingSlugForCountry(countrySlug);

  const { country, category, categories, tours } = await loadCategoryPageData(countrySlug, params.category);

  if (category) {
    return (
      <>
        <JsonLd
          table="categories"
          slug={params.category}
          path={`/${landingSlug}/${params.category}`}
          schemaHint="TouristTrip"
        />
        <PublicShellServer>
          <CategoryPageContent
            slug={countrySlug}
            country={country}
            categorySlug={params.category}
            initialCategories={categories}
            initialTours={tours}
            initialCategory={category}
            serverPreloaded
          />
        </PublicShellServer>
      </>
    );
  }

  redirect(destinationPublicPath(countrySlug));
}
