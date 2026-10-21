import { Suspense } from 'react';
import { permanentRedirect } from 'next/navigation';
import ParkDetailClient from './ParkDetailClient';
import PublicPageLoader from '@/components/public/PublicPageLoader';
import PublicShellServer from '@/components/public/PublicShellServer';
import { getPublicRecordImage } from '@/lib/content-image';
import { loadParkDetail, loadStaticParkParams } from '@/lib/load-public';
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

async function ParkDetailReady({ slug }: { slug: string }) {
  let park = null;
  let tours: Awaited<ReturnType<typeof loadParkDetail>>['tours'] = [];
  let others: Awaited<ReturnType<typeof loadParkDetail>>['others'] = [];
  try {
    const loaded = await loadParkDetail(slug);
    park = loaded.park;
    tours = loaded.tours ?? [];
    others = loaded.others ?? [];
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Park detail failed:', slug, error);
  }
  const heroImage = getPublicRecordImage(park) || '';
  preloadPublicHero(heroImage);
  return (
    <ParkDetailClient
      key={slug}
      embedded
      initialPark={park}
      initialOthers={others}
      initialTours={tours}
      initialHeroImage={heroImage}
    />
  );
}

export default function ParkDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  if (!slug) permanentRedirect('/tours');

  return (
    <PublicShellServer>
      <Suspense fallback={<PublicPageLoader />}>
        <ParkDetailReady slug={slug} />
      </Suspense>
    </PublicShellServer>
  );
}
