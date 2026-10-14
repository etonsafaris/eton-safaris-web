import { permanentRedirect } from 'next/navigation';
import ParkDetailClient from './ParkDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadPublicHeroImage, loadStaticParkParams } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  try {
    return await loadStaticParkParams();
  } catch (error) {
    console.warn('[Public] Park static params failed:', error);
    return [];
  }
}

export default async function ParkDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  if (!slug) permanentRedirect('/tours');
  let heroImage = '';
  try {
    heroImage = await loadPublicHeroImage('national_park', slug, ['national_parks', 'parks']);
  } catch (error) {
    rethrowDynamicServerError(error);
  }
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <ParkDetailClient
        key={slug}
        embedded
        initialPark={null}
        initialOthers={[]}
        initialTours={[]}
        initialHeroImage={heroImage}
      />
    </PublicShellServer>
  );
}
