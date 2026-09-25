import { prepareHomePageRenderState } from '@/lib/home-page-fallback';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { loadHomePageBundleResilient } from '@/lib/load-public';
import { safeHeroSlides } from '@/lib/home-page-payload';
import { NextResponse } from 'next/server';

export const revalidate = 300;

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
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      },
    }
  );
}
