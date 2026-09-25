import { CMS_PUBLIC_HTTP_CACHE_CONTROL, CMS_PUBLIC_REVALIDATE_SECONDS } from '@/lib/cms-public-cache';
import { prepareHomePageRenderState } from '@/lib/home-page-fallback';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { loadHomePageBundleResilient } from '@/lib/load-public';
import { safeHeroSlides } from '@/lib/home-page-payload';
import { NextResponse } from 'next/server';

export const revalidate = CMS_PUBLIC_REVALIDATE_SECONDS;

export async function GET() {
  const bundle = await loadHomePageBundleResilient();
  const state = prepareHomePageRenderState(bundle);
  const heroSlides = safeHeroSlides(buildHomeHeroSlides(state.data.countries));
  return NextResponse.json(
    {
      data: state.data,
      content: state.homeContent,
      destinations: state.destinations,
      heroSlides,
      needsClientRefresh: state.needsClientRefresh,
    },
    {
      headers: {
        'Cache-Control': CMS_PUBLIC_HTTP_CACHE_CONTROL,
      },
    }
  );
}
