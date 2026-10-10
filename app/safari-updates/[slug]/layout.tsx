import type { Metadata } from 'next';
import { isLanguagePost, safariUpdatePublicPath } from '@/lib/data';
import { resolveSafariUpdatePost } from '@/lib/safari-update-load';
import { publicRecordMetadata } from '@/lib/seo-public';

export { revalidate } from '@/lib/public-page-config';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await resolveSafariUpdatePost(params.slug).catch(() => null);
  const path =
    post && isLanguagePost(post) ? safariUpdatePublicPath(post) : `/safari-updates/${params.slug}`;
  return publicRecordMetadata('safari_updates', params.slug, path, {
    contentType: 'article',
  });
}

export default function SafariUpdateDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
