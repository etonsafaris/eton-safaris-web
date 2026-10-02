import type { Metadata } from 'next';
import PlacePageContent from '@/components/public/PlacePageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadExploreDetail, loadStaticExploreParams } from '@/lib/load-public';
import { EMPTY_EXPLORE_DETAIL, safePublicLoad } from '@/lib/safe-public-load';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  try {
    return await loadStaticExploreParams();
  } catch (error) {
    console.warn('[Public] Explore static params failed:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    return await publicRecordMetadata('explore', params.slug, `/explore/${params.slug}`, { contentType: 'place' });
  } catch (error) {
    console.warn('[Public] Explore metadata failed:', params.slug, error);
    return { title: 'Explore | Eton Safaris', robots: { index: false, follow: false } };
  }
}

export default async function ExploreDetailPage({ params }: PageProps) {
  const { place, others, tours } = await safePublicLoad(
    'explore detail page',
    () => loadExploreDetail(params.slug),
    EMPTY_EXPLORE_DETAIL,
    params.slug
  );
  return (
    <PublicShellServer>
      <PlacePageContent
        key={params.slug}
        placeSlug={params.slug}
        place={place}
        initialOthers={others ?? []}
        initialTours={tours ?? []}
      />
    </PublicShellServer>
  );
}
