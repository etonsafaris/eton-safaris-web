import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AccommodationDetailClient from './AccommodationDetailClient';
import { loadAccommodationDetail, loadStaticAccommodationParams } from '@/lib/load-public';
import { EMPTY_STAY_DETAIL, safePublicLoad } from '@/lib/safe-public-load';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  return loadStaticAccommodationParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    return await publicRecordMetadata('accommodations', params.slug, `/accommodations/${params.slug}`, {
      contentType: 'stay',
    });
  } catch (error) {
    console.warn('[Public] Accommodation metadata failed:', params.slug, error);
    return { title: 'Accommodation | Eton Safaris', robots: { index: false, follow: false } };
  }
}

export default async function AccommodationDetailPage({ params }: PageProps) {
  const { item, others, tours } = await safePublicLoad(
    'accommodation detail page',
    () => loadAccommodationDetail(params.slug),
    EMPTY_STAY_DETAIL,
    params.slug
  );
  if (!item) notFound();
  return (
    <AccommodationDetailClient
      key={params.slug}
      initialItem={item}
      initialOthers={others ?? []}
      initialTours={tours ?? []}
    />
  );
}
