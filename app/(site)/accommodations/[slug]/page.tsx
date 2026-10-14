import { permanentRedirect } from 'next/navigation';
import AccommodationDetailClient from './AccommodationDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { getPublicRecordImage } from '@/lib/content-image';
import { loadAccommodationDetail, loadStaticAccommodationParams } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';

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
  let item = null;
  let others: Awaited<ReturnType<typeof loadAccommodationDetail>>['others'] = [];
  let tours: Awaited<ReturnType<typeof loadAccommodationDetail>>['tours'] = [];
  try {
    const loaded = await loadAccommodationDetail(slug);
    item = loaded.item;
    others = loaded.others ?? [];
    tours = loaded.tours ?? [];
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Accommodation detail failed:', slug, error);
  }
  const heroImage = getPublicRecordImage(item) || '';
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <AccommodationDetailClient
        key={slug}
        embedded
        initialItem={item}
        initialOthers={others}
        initialTours={tours}
        initialHeroImage={heroImage}
      />
    </PublicShellServer>
  );
}
