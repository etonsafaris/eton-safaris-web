import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import SafariUpdateDetailClient from '../../[slug]/SafariUpdateDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { isLanguagePost, safariUpdatePublicPath } from '@/lib/data';
import { loadSafariUpdateDetailResilient } from '@/lib/load-public';
import { resolveSafariUpdatePost } from '@/lib/safari-update-load';
import { EMPTY_SAFARI_UPDATE_DETAIL, rethrowDynamicServerError, safePublicLoad } from '@/lib/safe-public-load';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    return await publicRecordMetadata(
      'safari_updates',
      params.slug,
      `/safari-updates/languages/${params.slug}`,
      { contentType: 'article' }
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Language post metadata failed:', params.slug, error);
    return { title: 'Safari Update | Eton Safaris', robots: { index: false, follow: false } };
  }
}

/** Language posts: Google landing URL, same as Dav /safari-updates/languages/{slug}. */
export default async function LanguagePostPage({ params }: PageProps) {
  const loadedPost = await resolveSafariUpdatePost(params.slug).catch((error) => {
    rethrowDynamicServerError(error);
    return null;
  });
  if (loadedPost && !isLanguagePost(loadedPost)) {
    permanentRedirect(`/safari-updates/${params.slug}`);
  }
  const { post, related, tours } = await safePublicLoad(
    'language post page',
    () => loadSafariUpdateDetailResilient(params.slug),
    EMPTY_SAFARI_UPDATE_DETAIL,
    params.slug
  );
  if (post && !isLanguagePost(post)) {
    permanentRedirect(safariUpdatePublicPath(post));
  }
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
