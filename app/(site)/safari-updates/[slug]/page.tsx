import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import SafariUpdateDetailClient from './SafariUpdateDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { isLanguagePost, safariUpdatePublicPath } from '@/lib/data';
import { loadSafariUpdateDetailResilient, loadStaticSafariUpdateParams } from '@/lib/load-public';
import { resolveSafariUpdatePost } from '@/lib/safari-update-load';
import { EMPTY_SAFARI_UPDATE_DETAIL, rethrowDynamicServerError, safePublicLoad } from '@/lib/safe-public-load';
import { publicRecordMetadata } from '@/lib/seo-public';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const post = await resolveSafariUpdatePost(params.slug).catch((error) => {
      rethrowDynamicServerError(error);
      return null;
    });
    const path =
      post && isLanguagePost(post) ? safariUpdatePublicPath(post) : `/safari-updates/${params.slug}`;
    return await publicRecordMetadata('safari_updates', params.slug, path, {
      contentType: 'article',
    });
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Safari update metadata failed:', params.slug, error);
    return { title: 'Safari Update | Eton Safaris', robots: { index: false, follow: false } };
  }
}

export default async function SafariUpdateDetailPage({ params }: PageProps) {
  const loadedPost = await resolveSafariUpdatePost(params.slug).catch((error) => {
    rethrowDynamicServerError(error);
    return null;
  });
  if (loadedPost && isLanguagePost(loadedPost)) {
    permanentRedirect(safariUpdatePublicPath(loadedPost));
  }
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
