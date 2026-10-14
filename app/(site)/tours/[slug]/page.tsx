import { permanentRedirect } from 'next/navigation';
import TourDetailClient from './TourDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { getPublicRecordImage } from '@/lib/content-image';
import { loadStaticTourParams, loadTourDetail } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';

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

export default async function TourDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  if (!slug) permanentRedirect('/tours');
  let tour = null;
  let related: Awaited<ReturnType<typeof loadTourDetail>>['related'] = [];
  try {
    const loaded = await loadTourDetail(slug);
    tour = loaded.tour;
    related = loaded.related ?? [];
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Tour detail failed:', slug, error);
  }
  const heroImage = getPublicRecordImage(tour) || '';
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <TourDetailClient
        key={slug}
        embedded
        initialTour={tour}
        initialRelated={related}
        initialHeroImage={heroImage}
      />
    </PublicShellServer>
  );
}
