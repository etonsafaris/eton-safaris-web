'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Carousel from '@/components/public/Carousel';
import dynamic from 'next/dynamic';
import HomePageImage from '@/components/public/HomePageImage';
const TourSearchBar = dynamic(() => import('@/components/public/TourSearchBar'), {
  loading: () => <div className="min-h-[52px] w-full max-w-3xl rounded-md bg-white/10" aria-hidden />,
});
import SectionHeading from '@/components/public/SectionHeading';
const TestimonialsSection = dynamic(() => import('@/components/public/TestimonialsSection'), {
  loading: () => null,
});
const PaymentsSection = dynamic(() => import('@/components/public/PaymentsSection'), {
  loading: () => null,
});
import TourCard from '@/components/public/TourCard';
import PageFaqList from '@/components/public/PageFaqList';
import type { HomeHeroSlide } from '@/lib/home-hero-slides';
import { resolveHomePageContent, safeHeroSlides } from '@/lib/home-page-payload';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import { useHomePageRecovery } from '@/lib/use-home-page-recovery';
import type { HomePageContent } from '@/lib/home-page-content';
import { destinationPublicPath } from '@/lib/cms-routes';
import { stashPublicReadRecord } from '@/lib/public-read-prefill';
import { canonicalCountrySlug, publicCountrySlug, publicCountryLabel } from '@/lib/country-utils';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
import {
  destinationListingRows,
  mergePublicDestinations,
  publicDestinationNames,
} from '@/lib/public-destinations';
import {
  getRecordImage,
  getRecordTitle,
  pickString,
  pickPlainText,
  publicRecordSlug,
  recordCardBlurb,
  recordPublishedAt,
} from '@/lib/data';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { countryHeroImage } from '@/lib/country-heroes';
import { resolvePublicHeroCarouselImage } from '@/lib/public-image';
import { countryCardRemoteFallback } from '@/lib/country-hero-fallback';
import { stripPublicMoney } from '@/lib/public-money';
import { selectHomePopularTours } from '@/lib/home-featured-tours';
import type { RecordRow } from '@/lib/types';

type HomePageClientProps = {
  initialHeroSlides: HomeHeroSlide[];
  initialCountries: RecordRow[];
  initialTours: RecordRow[];
  initialUpdates: RecordRow[];
  initialCategories: RecordRow[];
  initialHomeContent?: HomePageContent | null;
  needsClientRefresh?: boolean;
};

export default function HomePageClient({
  initialHeroSlides,
  initialCountries,
  initialTours,
  initialUpdates,
  initialCategories,
  initialHomeContent,
  needsClientRefresh = false,
}: HomePageClientProps) {
  const [slide, setSlide] = useState(0);
  const liveHomeContent = useHomePageContent(initialHomeContent);
  const homeContent = useMemo(
    () => resolveHomePageContent(liveHomeContent),
    [liveHomeContent]
  );

  const initialPayload = useMemo(
    () => ({
      countries: initialCountries ?? [],
      tours: initialTours ?? [],
      updates: initialUpdates ?? [],
      categories: initialCategories ?? [],
    }),
    [initialCategories, initialCountries, initialTours, initialUpdates]
  );

  const { data: liveData, heroSlides: recoveredHeroSlides } = useHomePageRecovery({
    initialData: initialPayload,
    initialHeroSlides: initialHeroSlides ?? [],
    needsClientRefresh,
  });

  const countries = liveData.countries;
  const tours = liveData.tours;
  const updates = liveData.updates;
  const categories = liveData.categories;

  const heroSlides = useMemo(() => {
    const fromRecovery = (recoveredHeroSlides ?? []).filter((item) =>
      Boolean(resolvePublicHeroCarouselImage(item?.image))
    );
    if (fromRecovery.length) return fromRecovery;
    const initial = safeHeroSlides(initialHeroSlides ?? []);
    return initial;
  }, [recoveredHeroSlides, initialHeroSlides]);

  useEffect(() => {
    if (!heroSlides.length) return;
    const nextIndex = (slide + 1) % heroSlides.length;
    for (const index of [slide, nextIndex]) {
      const url = resolvePublicHeroCarouselImage(heroSlides[index]?.image);
      if (!url) continue;
      const img = new window.Image();
      img.decoding = 'async';
      if (index === slide && 'fetchPriority' in img) {
        try {
          (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = index === 0 ? 'high' : 'low';
        } catch {
          // ignore
        }
      }
      img.src = url;
    }
  }, [heroSlides, slide]);

  useEffect(() => {
    if (heroSlides.length === 0) return undefined;
    const timer = setInterval(() => setSlide((value) => (value + 1) % heroSlides.length), 7000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  function goHero(next: number) {
    if (heroSlides.length === 0) return;
    setSlide(((next % heroSlides.length) + heroSlides.length) % heroSlides.length);
  }

  const destinationOptions = useMemo(
    () => publicDestinationNames(mergePublicDestinations(countries)),
    [countries]
  );

  const current = heroSlides?.[slide] ?? heroSlides?.[0];

  const featuredTours = useMemo(() => selectHomePopularTours(tours ?? [], 12), [tours]);

  const tourItems = useMemo(
    () =>
      (featuredTours ?? []).map((tour, index) => (
        <TourCard key={String(tour?.id ?? index)} tour={tour} />
      )),
    [featuredTours]
  );

  const destinationRows = useMemo(() => destinationListingRows(countries ?? []), [countries]);

  const blogItems = (updates ?? [])?.map((post, index) => {
    const image = post ? getRecordImage(post) : '';
    const slug = post ? publicRecordSlug(post) || String(post?.id ?? '') : '';
    return (
      <Link
        key={String(post?.id ?? index)}
        href={`/safari-updates/${slug}`}
        onClick={() => post && stashPublicReadRecord('safari_updates', post)}
        className="group block h-full overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-xl"
      >
        {image ? (
          <HomePageImage
            src={image}
            alt=""
            variant="card"
            sizes="(max-width: 640px) 100vw, 25vw"
            width={640}
            height={480}
            className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-gray-100 text-sm text-gray-400">
            No image
          </div>
        )}
        <div className="p-4">
          {post && recordPublishedAt(post) ? (
            <p className="text-xs text-gray-400">{formatPublishedDate(recordPublishedAt(post))}</p>
          ) : null}
          <h4 className="mt-1 font-serif text-lg font-bold text-[#333]">{post ? getRecordTitle(post) : ''}</h4>
          <p className="mt-2 line-clamp-2 text-sm text-[#666]">
            {post ? stripPublicMoney(pickPlainText(post, ['excerpt', 'description', 'content'])) : ''}
          </p>
        </div>
      </Link>
    );
  });

  const destinationItems = (destinationRows ?? [])?.map((country, index) => {
    const slug =
      publicCountrySlug(country) ||
      canonicalCountrySlug(publicCountryLabel(country as RecordRow)) ||
      '';
    const countryImage =
      countryHeroImage(slug, country as RecordRow) || countryCardRemoteFallback(slug);
    const countryLabel = publicCountryLabel(country as RecordRow, slug);
    return (
      <Link key={slug || String(country.id ?? index)} href={destinationPublicPath(slug)} className="group block h-full">
        <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-sm">
          {countryImage ? (
            <HomePageImage
              src={countryImage}
              alt={countryLabel ? `Safari tours in ${countryLabel}` : ''}
              variant="card"
              allowCarouselFallback
              sizes="(max-width: 768px) 100vw, 33vw"
              width={800}
              height={500}
              priority={false}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-400">No image</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141612]/80 via-[#141612]/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h4 className="mb-1 font-serif text-2xl font-bold text-white">
              {publicCountryLabel(country as RecordRow, slug)}
            </h4>
            <p className="text-xs font-semibold uppercase tracking-widest text-sage">
              {pickString(country, ['tagline', 'subtitle'])}
            </p>
          </div>
        </div>
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-[#666]">
          {stripPublicMoney(
            pickPlainText(country, ['tagline', 'description_title', 'excerpt', 'description']) ||
              recordCardBlurb(country as RecordRow)
          )}
        </p>
        <span className="text-xs font-semibold uppercase tracking-widest text-moss group-hover:text-[#4a6b3a]">
          Popular Tour
        </span>
      </Link>
    );
  });

  return (
    <>
      {current?.image ? (
        <section className="relative h-[500px] overflow-hidden bg-[#141612] md:h-[600px]">
          <HomePageImage
            key={current.image}
            src={current.image}
            alt={current?.title ? String(current.title) : 'Eton Safaris destination'}
            variant="hero"
            priority={true}
            quality={85}
            sizes="100vw"
            width={1440}
            height={900}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/20" />
          <button
            type="button"
            onClick={() => goHero(slide - 1)}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white hover:bg-black/45"
            aria-label="Previous hero slide"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => goHero(slide + 1)}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white hover:bg-black/45"
            aria-label="Next hero slide"
          >
            <ChevronRight />
          </button>
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl rounded-[3rem] border border-white/20 bg-black/15 px-8 py-6 text-center shadow-2xl backdrop-blur-sm md:px-12 md:py-8">
              <h1
                className="mb-2 font-serif text-2xl font-bold leading-tight text-white md:text-4xl"
                style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.9)' }}
              >
                {current?.title ?? ''}
              </h1>
              <p
                className="mb-4 text-sm leading-snug text-white/90 md:text-base"
                style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}
              >
                {current?.subtitle ?? ''}
              </p>
              <Link
                href={current?.href ?? '/destinations'}
                className="pointer-events-auto inline-block rounded-full bg-moss/90 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm hover:bg-moss"
              >
                {current?.cta ?? 'Explore'}
              </Link>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {(heroSlides ?? []).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goHero(index)}
                className={`relative z-20 h-2 w-2 rounded-full ${index === slide ? 'bg-white' : 'bg-white/40'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <TourSearchBar tours={tours ?? []} categories={categories ?? []} destinations={destinationOptions ?? []} />

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Popular Tours" title="Explore Our Most Popular Tours" />
          <div className="mt-10">
            <Carousel
              instant
              items={tourItems}
              itemsPerView={{ sm: 1, md: 2, lg: 4 }}
              emptyMessage="Popular East Africa tours are loading. Refresh in a moment or browse all tours."
            />
          </div>
        </div>
      </section>

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Find tours by" title="Destination" />
          <div className="mt-10">
            <Carousel instant items={destinationItems} itemsPerView={{ sm: 1, md: 2, lg: 3 }} emptyMessage="No records found in this collection." />
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/destinations"
              className="inline-flex items-center gap-2 rounded-full bg-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a]"
            >
              {PUBLIC_SITE_LABELS.moreGetaways} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Stay up to date with" title={PUBLIC_SITE_LABELS.blogPosts} />
          <div className="mt-10">
            <Carousel
              instant
              items={blogItems}
              itemsPerView={{ sm: 1, md: 2, lg: 4 }}
              emptyMessage="No records found in this collection."
            />
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/safari-updates"
              className="inline-flex items-center gap-2 border-2 border-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-moss hover:bg-moss hover:text-white"
            >
              More Updates
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8">
        <PageFaqList faqs={homeContent?.faqs ?? []} tone="light" />
      </section>

      <TestimonialsSection />
      <PaymentsSection />
    </>
  );
}
