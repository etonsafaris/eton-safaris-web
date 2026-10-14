import SafariUpdateDetailClient from './SafariUpdateDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadStaticSafariUpdateParams } from '@/lib/load-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  try {
    return await loadStaticSafariUpdateParams();
  } catch (error) {
    console.warn('[Public] Safari update static params failed:', error);
    return [];
  }
}

export default function SafariUpdateDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  return (
    <PublicShellServer>
      <SafariUpdateDetailClient key={slug} embedded initialPost={null} initialRelated={[]} initialTours={[]} />
    </PublicShellServer>
  );
}
