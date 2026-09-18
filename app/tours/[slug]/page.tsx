import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TourDetailClient from './TourDetailClient';
import { loadTourDetail } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export { revalidate } from '@/lib/public-page-config';

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return publicRecordMetadata('tours', params.slug, `/tours/${params.slug}`);
}

export default async function TourDetailPage({ params }: PageProps) {
  const { tour, related } = await loadTourDetail(params.slug);
  if (!tour) notFound();
  return <TourDetailClient key={params.slug} initialTour={tour} initialRelated={related} />;
}
