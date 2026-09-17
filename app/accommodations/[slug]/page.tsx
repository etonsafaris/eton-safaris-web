import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AccommodationDetailClient from './AccommodationDetailClient';
import { loadAccommodationDetail } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return publicRecordMetadata('accommodations', params.slug, `/accommodations/${params.slug}`);
}

export default async function AccommodationDetailPage({ params }: PageProps) {
  const { item, others, tours } = await loadAccommodationDetail(params.slug);
  if (!item) notFound();
  return <AccommodationDetailClient initialItem={item} initialOthers={others} initialTours={tours} />;
}
