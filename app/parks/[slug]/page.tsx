import type { Metadata } from 'next';
import ParkDetailClient from './ParkDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadParkDetail, loadStaticParkParams } from '@/lib/load-public';
import { EMPTY_PARK_DETAIL, safePublicLoad } from '@/lib/safe-public-load';
import { publicRecordMetadata } from '@/lib/seo-public';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    return await publicRecordMetadata('national_park', params.slug, `/parks/${params.slug}`, {
      aliases: ['national_parks', 'parks'],
      contentType: 'park',
    });
  } catch (error) {
    console.warn('[Public] Park metadata failed:', params.slug, error);
    return { title: 'National Park | Eton Safaris', robots: { index: false, follow: false } };
  }
}

export default async function ParkDetailPage({ params }: PageProps) {
  const { park, others, stays } = await safePublicLoad(
    'park detail page',
    () => loadParkDetail(params.slug),
    EMPTY_PARK_DETAIL,
    params.slug
  );
  return (
    <PublicShellServer>
      <ParkDetailClient
        key={params.slug}
        embedded
        initialPark={park}
        initialOthers={others ?? []}
        initialStays={stays ?? []}
      />
    </PublicShellServer>
  );
}
