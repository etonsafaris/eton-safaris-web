import { preloadPublicHero } from '@/lib/preload-public-hero';
import { getPublicRecordImage } from '@/lib/content-image';
import { loadSafariUpdateDetailResilient, loadStaticSafariUpdateParams } from '@/lib/load-public';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';
import SafariUpdateDetailClient from './SafariUpdateDetailClient';
import PublicShellServer from '@/components/public/PublicShellServer';

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

export default async function SafariUpdateDetailPage({ params }: PageProps) {
  const slug = params?.slug?.trim() ?? '';
  let post = null;
  let related: Awaited<ReturnType<typeof loadSafariUpdateDetailResilient>>['related'] = [];
  let tours: Awaited<ReturnType<typeof loadSafariUpdateDetailResilient>>['tours'] = [];
  try {
    const loaded = await loadSafariUpdateDetailResilient(slug);
    post = loaded.post;
    related = loaded.related ?? [];
    tours = loaded.tours ?? [];
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Safari update article failed:', slug, error);
  }
  const heroImage = getPublicRecordImage(post) || '';
  preloadPublicHero(heroImage);

  return (
    <PublicShellServer>
      <SafariUpdateDetailClient
        key={slug}
        embedded
        initialPost={post}
        initialHeroImage={heroImage}
        initialRelated={related}
        initialTours={tours}
      />
    </PublicShellServer>
  );
}
