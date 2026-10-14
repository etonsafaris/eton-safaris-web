import { permanentRedirect } from 'next/navigation';
import TourDetailClient from './TourDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadPublicHeroImage, loadStaticTourParams } from '@/lib/load-public';
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
  let heroImage = '';
  try {
    heroImage = await loadPublicHeroImage('tours', slug);
  } catch (error) {
    rethrowDynamicServerError(error);
  }
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <TourDetailClient key={slug} embedded initialTour={null} initialRelated={[]} initialHeroImage={heroImage} />
    </PublicShellServer>
  );
}
