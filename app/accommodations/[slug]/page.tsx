import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AccommodationDetailClient from './AccommodationDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadAccommodationDetailSynced, loadStaticAccommodationParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

/** Admin-synced stay detail — Aiven visibility guard + 60s ISR. */
export const revalidate = 60;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params?.slug ?? '';
  try {
    return await publicRecordMetadata('accommodations', slug, `/accommodations/${slug}`, {
      contentType: 'stay',
    });
  } catch (error) {
    console.warn('[Public] Accommodation metadata failed:', slug, error);
    return { title: 'Accommodation | Eton Safaris', robots: { index: false, follow: false } };
  }
}

export default async function AccommodationDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  if (!slug) notFound();

  const data = await loadAccommodationDetailSynced(slug);
  if (!data?.item) notFound();

  return (
    <PublicShellServer>
      <AccommodationDetailClient
        key={slug}
        embedded
        initialItem={data.item}
        initialOthers={data.others ?? []}
        initialTours={data.tours ?? []}
      />
    </PublicShellServer>
  );
}
