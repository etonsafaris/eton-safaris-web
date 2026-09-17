import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PlacePageContent from '@/components/public/PlacePageContent';
import PublicShell from '@/components/public/PublicShell';
import { loadExploreDetail } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return publicRecordMetadata('explore', params.slug, `/explore/${params.slug}`, { contentType: 'place' });
}

export default async function ExploreDetailPage({ params }: PageProps) {
  const { place, others, tours } = await loadExploreDetail(params.slug);
  if (!place) notFound();
  return (
    <PublicShell>
      <PlacePageContent
        placeSlug={params.slug}
        place={place}
        initialOthers={others}
        initialTours={tours}
      />
    </PublicShell>
  );
}
