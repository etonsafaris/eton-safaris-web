import { CMS_PUBLIC_HTTP_CACHE_CONTROL, CMS_PUBLIC_REVALIDATE_SECONDS } from '@/lib/cms-public-cache';
import { prepareHomePageRenderState, STATIC_FALLBACK_HOME_PAYLOAD } from '@/lib/home-page-fallback';
import { buildHomeHeroSlides, fallbackHomeHeroSlides } from '@/lib/home-hero-slides';
import { loadHomePageBundleResilient } from '@/lib/load-public';
import { safeHeroSlides } from '@/lib/home-page-payload';
import { NextResponse } from 'next/server';

export const revalidate = CMS_PUBLIC_REVALIDATE_SECONDS;
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  try {
    const bundle = await loadHomePageBundleResilient();
    const state = prepareHomePageRenderState(bundle);
    const built = safeHeroSlides(buildHomeHeroSlides(state.data.countries));
    const heroSlides = built.length ? built : safeHeroSlides(fallbackHomeHeroSlides());
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
  } catch (error) {
    console.error('[Public] home-bundle API failed:', error);
    const state = prepareHomePageRenderState({
      data: STATIC_FALLBACK_HOME_PAYLOAD,
      content: null,
      destinations: undefined,
    });
    const heroSlides = safeHeroSlides(fallbackHomeHeroSlides());
    return NextResponse.json(
      {
        data: state.data,
        content: state.homeContent,
        destinations: state.destinations,
        heroSlides,
        needsClientRefresh: true,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  }
}
