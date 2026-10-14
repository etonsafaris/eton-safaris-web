import { permanentRedirect } from 'next/navigation';
import ParkDetailClient from './ParkDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadStaticParkParams } from '@/lib/load-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  try {
    return await loadStaticParkParams();
  } catch (error) {
    console.warn('[Public] Park static params failed:', error);
    return [];
  }
}

export default function ParkDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  if (!slug) permanentRedirect('/tours');

  return (
    <PublicShellServer>
      <ParkDetailClient key={slug} embedded initialPark={null} initialOthers={[]} initialTours={[]} />
    </PublicShellServer>
  );
}
