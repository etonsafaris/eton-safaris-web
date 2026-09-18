'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Carousel from '@/components/public/Carousel';
import PaymentsSection from '@/components/public/PaymentsSection';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import PlaceCard from '@/components/public/PlaceCard';
import TourSearchBar from '@/components/public/TourSearchBar';
import SectionHeading from '@/components/public/SectionHeading';
import TestimonialsSection from '@/components/public/TestimonialsSection';
import TourCard from '@/components/public/TourCard';
import WhatSetsUsApartSection from '@/components/public/WhatSetsUsApartSection';
import PageFaqList from '@/components/public/PageFaqList';
import { DEFAULT_HOME_PAGE_CONTENT, type HomePageContent } from '@/lib/home-page-content';
import { destinationPublicPath } from '@/lib/cms-routes';
import type { HomeHeroSlide } from '@/lib/home-hero-slides';
import { canonicalCountrySlug, publicCountrySlug, publicCountryLabel } from '@/lib/country-utils';
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
import { stripPublicMoney } from '@/lib/public-money';
import type { RecordRow } from '@/lib/types';

type HomePageClientProps = {
  initialHeroSlides: HomeHeroSlide[];
  initialCountries: RecordRow[];
  initialTours: RecordRow[];
  initialUpdates: RecordRow[];
  initialCategories: RecordRow[];
  initialHomeContent?: HomePageContent | null;
};

function resolveHomeContent(initialHomeContent?: HomePageContent | null): HomePageContent {
  return initialHomeContent ?? DEFAULT_HOME_PAGE_CONTENT;
}

export default function HomePageClient({
  initialHeroSlides,
  initialCountries,
  initialTours,
  initialUpdates,
  initialCategories,
  initialHomeContent,
}: HomePageClientProps) {
  const [slide, setSlide] = useState(0);
  const homeContent = useMemo(() => resolveHomeContent(initialHomeContent), [initialHomeContent]);
  const countries = initialCountries;
  const tours = initialTours;
  const updates = initialUpdates;
  const categories = initialCategories;

  const heroSlides = initialHeroSlides;

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

  const current = heroSlides[slide] || heroSlides[0];

  const featuredTours = useMemo(() => {
    const preferred = tours.filter((tour) => tour.is_featured || tour.is_popular || tour.show_on_landing);
    return (preferred.length ? preferred : tours).slice(0, 12);
  }, [tours]);

  const tourItems = featuredTours.map((tour, index) => (
    <TourCard key={String(tour.id ?? index)} tour={tour} />
  ));

  const destinationRows = useMemo(() => destinationListingRows(countries), [countries]);

  const destinationItems = destinationRows.map((country, index) => {
    const slug =
      publicCountrySlug(country) ||
      canonicalCountrySlug(publicCountryLabel(country as RecordRow)) ||
      '';
    return (
      <Link key={slug || String(country.id ?? index)} href={destinationPublicPath(slug)} className="group block h-full">
        <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-sm">
          {countryHeroImage(slug, country as RecordRow) ? (
            <ResponsiveImage
              src={countryHeroImage(slug, country as RecordRow)}
              alt=""
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
      {current && (
        <section className="relative h-[500px] overflow-hidden bg-[#141612] md:h-[600px]">
          {current.image ? (
            <ResponsiveImage
              key={current.image}
              src={current.image}
              alt=""
              variant="hero"
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
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
            <div className="w-full max-w-2xl rounded-[3rem] border border-white/15 bg-black/30 px-8 py-6 text-center shadow-2xl backdrop-blur-md md:px-12 md:py-8">
              <h1
                className="mb-2 font-serif text-2xl font-bold leading-tight text-white md:text-4xl"
                style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.9)' }}
              >
                {current.title}
              </h1>
              <p
                className="mb-4 text-sm leading-snug text-white/90 md:text-base"
                style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}
              >
                {current.subtitle}
              </p>
              <Link
                href={current.href}
                className="pointer-events-auto inline-block rounded-full bg-moss/90 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm hover:bg-moss"
              >
                {current.cta}
              </Link>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {heroSlides.map((_, index) => (
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
      )}

      <TourSearchBar tours={tours} categories={categories} destinations={destinationOptions} />

      <WhatSetsUsApartSection
        heading={homeContent.setsApartHeading}
        intro={homeContent.setsApartIntro}
        features={homeContent.features}
        videos={homeContent.videos}
      />

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Popular Tours" title="Explore Our Most Popular Tours" />
          <div className="mt-10">
            <Carousel instant items={tourItems} itemsPerView={{ sm: 1, md: 2, lg: 4 }} emptyMessage="No records found in this collection." />
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
              Other Destinations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Stay up to date with" title="Safari Updates" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {updates.slice(0, 4).map((post, index) => (
              <Link
                key={String(post.id ?? index)}
                href={`/safari-updates/${publicRecordSlug(post) || String(post.id ?? '')}`}
                className="group block overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-xl"
              >
                {getRecordImage(post) ? (
                  <ResponsiveImage
                    src={getRecordImage(post) || ''}
                    alt=""
                    className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gray-100 text-sm text-gray-400">
                    No image
                  </div>
                )}
                <div className="p-4">
                  {recordPublishedAt(post) ? (
                    <p className="text-xs text-gray-400">{formatPublishedDate(recordPublishedAt(post))}</p>
                  ) : null}
                  <h4 className="mt-1 font-serif text-lg font-bold text-[#333]">{getRecordTitle(post)}</h4>
                  <p className="mt-2 line-clamp-2 text-sm text-[#666]">
                    {stripPublicMoney(pickPlainText(post, ['excerpt', 'description', 'content']))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {updates.length === 0 && (
            <p className="mt-6 text-center text-gray-500">No records found in this collection.</p>
          )}
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
        <PageFaqList faqs={homeContent.faqs || []} tone="light" />
      </section>

      <TestimonialsSection />
      <PaymentsSection />
    </>
  );
}
