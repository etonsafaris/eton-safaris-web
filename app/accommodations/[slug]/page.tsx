import type { Metadata } from 'next';
import AccommodationDetailClient from './AccommodationDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadAccommodationDetail, loadStaticAccommodationParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';
import type { RecordRow } from '@/lib/types';

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
  let item: RecordRow | null = null;
  let others: RecordRow[] = [];
  let tours: RecordRow[] = [];

  try {
    const data = await loadAccommodationDetail(slug);
    item = data?.item ?? null;
    others = data?.others ?? [];
    tours = data?.tours ?? [];
  } catch (error) {
    console.error('[Accommodation detail] Failed to load stay:', slug, error);
  }

  return (
    <PublicShellServer>
      <AccommodationDetailClient
        key={slug}
        embedded
        initialItem={item}
        initialOthers={others}
        initialTours={tours}
      />
    </PublicShellServer>
  );
}
