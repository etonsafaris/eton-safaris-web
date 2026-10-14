import { permanentRedirect } from 'next/navigation';
import TourDetailClient from './TourDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadStaticTourParams } from '@/lib/load-public';

/** The title paints immediately. The saved tour fills in behind it. */
export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  try {
    return await loadStaticTourParams();
  } catch (error) {
    console.warn('[Public] Tour static params failed:', error);
    return [];
  }
}

export default function TourDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  if (!slug) permanentRedirect('/tours');

  return (
    <PublicShellServer>
      <TourDetailClient key={slug} embedded initialTour={null} initialRelated={[]} />
    </PublicShellServer>
  );
}
