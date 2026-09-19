import type { Metadata } from 'next';
import TourDetailClient from './TourDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadStaticTourParams, loadTourDetail } from '@/lib/load-public';
import { EMPTY_TOUR_DETAIL, safePublicLoad } from '@/lib/safe-public-load';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  return loadStaticTourParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    return await publicRecordMetadata('tours', params.slug, `/tours/${params.slug}`, { contentType: 'tour' });
  } catch (error) {
    console.warn('[Public] Tour metadata failed:', params.slug, error);
    return { title: 'Tour | Eton Safaris', robots: { index: false, follow: false } };
  }
}

export default async function TourDetailPage({ params }: PageProps) {
  const { tour, related } = await safePublicLoad(
    'tour detail page',
    () => loadTourDetail(params.slug),
    EMPTY_TOUR_DETAIL,
    params.slug
  );
  return (
    <PublicShellServer>
      <TourDetailClient
        key={params.slug}
        embedded
        initialTour={tour}
        initialRelated={related ?? []}
      />
    </PublicShellServer>
  );
}
