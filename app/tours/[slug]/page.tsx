import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TourDetailClient from './TourDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadStaticTourParams, loadTourDetailSynced } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';
import { safePublicDetailLoad } from '@/lib/safe-public-load';

/** Edge ISR + on-demand revalidate from admin; slugs pre-built at deploy. */
export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  try {
    return await loadStaticTourParams();
  } catch (error) {
    console.warn('[Public] Tour static params failed:', error);
    return [];
  }
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
  const slug = params?.slug?.trim() ?? '';
  if (!slug) notFound();

  const loaded = await safePublicDetailLoad('tour detail page', () => loadTourDetailSynced(slug), slug);
  if (!loaded?.tour) notFound();

  const { tour, related } = loaded;

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
