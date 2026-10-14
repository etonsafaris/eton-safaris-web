import { permanentRedirect } from 'next/navigation';
import AccommodationDetailClient from './AccommodationDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadPublicHeroImage, loadStaticAccommodationParams } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';

/** Edge ISR + on-demand revalidate from admin; slugs pre-built at deploy. */
export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  try {
    return await loadStaticAccommodationParams();
  } catch (error) {
    console.warn('[Public] Accommodation static params failed:', error);
    return [];
  }
}

export default async function AccommodationDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  if (!slug) permanentRedirect('/tours');
  let heroImage = '';
  try {
    heroImage = await loadPublicHeroImage('accommodations', slug);
  } catch (error) {
    rethrowDynamicServerError(error);
  }
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <AccommodationDetailClient
        key={slug}
        embedded
        initialItem={null}
        initialOthers={[]}
        initialTours={[]}
        initialHeroImage={heroImage}
      />
    </PublicShellServer>
  );
}
