import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PlacePageContent from '@/components/public/PlacePageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadExploreDetail, loadStaticExploreParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  return loadStaticExploreParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return publicRecordMetadata('explore', params.slug, `/explore/${params.slug}`, { contentType: 'place' });
}

export default async function ExploreDetailPage({ params }: PageProps) {
  const { place, others, tours } = await loadExploreDetail(params.slug);
  if (!place) notFound();
  return (
    <PublicShellServer>
      <PlacePageContent
        key={params.slug}
        placeSlug={params.slug}
        place={place}
        initialOthers={others}
        initialTours={tours}
      />
    </PublicShellServer>
  );
}
