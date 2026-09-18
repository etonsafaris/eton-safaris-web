import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ParkDetailClient from './ParkDetailClient';
import { loadParkDetail, loadStaticParkParams } from '@/lib/load-public';
import { EMPTY_PARK_DETAIL, safePublicLoad } from '@/lib/safe-public-load';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  return loadStaticParkParams();
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
  if (!park) notFound();
  return (
    <ParkDetailClient
      key={params.slug}
      initialPark={park}
      initialOthers={others ?? []}
      initialStays={stays ?? []}
    />
  );
}
