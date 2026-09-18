import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AccommodationDetailClient from './AccommodationDetailClient';
import { loadAccommodationDetail, loadStaticAccommodationParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  return loadStaticAccommodationParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return publicRecordMetadata('accommodations', params.slug, `/accommodations/${params.slug}`, {
    contentType: 'stay',
  });
}

export default async function AccommodationDetailPage({ params }: PageProps) {
  const { item, others, tours } = await loadAccommodationDetail(params.slug);
  if (!item) notFound();
  return (
    <AccommodationDetailClient
      key={params.slug}
      initialItem={item}
      initialOthers={others}
      initialTours={tours}
    />
  );
}
