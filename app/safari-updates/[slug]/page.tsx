import type { Metadata } from 'next';
import SafariUpdateDetailClient from './SafariUpdateDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadSafariUpdateDetailResilient, loadStaticSafariUpdateParams } from '@/lib/load-public';
import { EMPTY_SAFARI_UPDATE_DETAIL, safePublicLoad } from '@/lib/safe-public-load';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  return loadStaticSafariUpdateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    return await publicRecordMetadata('safari_updates', params.slug, `/safari-updates/${params.slug}`, {
      contentType: 'article',
    });
  } catch (error) {
    console.warn('[Public] Safari update metadata failed:', params.slug, error);
    return { title: 'Safari Update | Eton Safaris', robots: { index: false, follow: false } };
  }
}

export default async function SafariUpdateDetailPage({ params }: PageProps) {
  const { post, related, tours } = await safePublicLoad(
    'safari update detail page',
    () => loadSafariUpdateDetailResilient(params.slug),
    EMPTY_SAFARI_UPDATE_DETAIL,
    params.slug
  );
  return (
    <PublicShellServer>
      <SafariUpdateDetailClient
        key={params.slug}
        embedded
        initialPost={post}
        initialRelated={related ?? []}
        initialTours={tours ?? []}
      />
    </PublicShellServer>
  );
}
