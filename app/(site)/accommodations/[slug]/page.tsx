import { permanentRedirect } from 'next/navigation';
import AccommodationDetailClient from './AccommodationDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadStaticAccommodationParams } from '@/lib/load-public';

/** The title paints immediately. The saved stay fills in behind it. */
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

export default function AccommodationDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  if (!slug) permanentRedirect('/tours');

  return (
    <PublicShellServer>
      <AccommodationDetailClient key={slug} embedded initialItem={null} initialOthers={[]} initialTours={[]} />
    </PublicShellServer>
  );
}
