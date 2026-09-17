import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ParkDetailClient from './ParkDetailClient';
import { loadParkDetail } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return publicRecordMetadata('national_park', params.slug, `/parks/${params.slug}`, {
    aliases: ['national_parks', 'parks'],
  });
}

export default async function ParkDetailPage({ params }: PageProps) {
  const { park, others, stays } = await loadParkDetail(params.slug);
  if (!park) notFound();
  return <ParkDetailClient initialPark={park} initialOthers={others} initialStays={stays} />;
}
