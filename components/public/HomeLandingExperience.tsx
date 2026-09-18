'use client';

import Link from 'next/link';
import { ArrowRight, Compass, Leaf, Shield, Sparkles } from 'lucide-react';
import TourSearchBar from '@/components/public/TourSearchBar';
import TourCard from '@/components/public/TourCard';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import PaymentsSection from '@/components/public/PaymentsSection';
import TestimonialsSection from '@/components/public/TestimonialsSection';
import WhatSetsUsApartSection from '@/components/public/WhatSetsUsApartSection';
import PageFaqList from '@/components/public/PageFaqList';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import type { HomePageContent } from '@/lib/home-page-content';
import { destinationPublicPath } from '@/lib/cms-routes';
import { publicCountryLabel, publicCountrySlug } from '@/lib/country-utils';
import { countryHeroImage } from '@/lib/country-heroes';
import {
  formatPublishedDate,
  getRecordImage,
  getRecordTitle,
  pickPlainText,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
  recordPublishedAt,
} from '@/lib/data';
import { stripPublicMoney } from '@/lib/public-money';
import type { RecordRow } from '@/lib/types';

type Props = {
  tours: RecordRow[];
  updates: RecordRow[];
  countries: RecordRow[];
  categories: RecordRow[];
  destinationOptions: string[];
  initialHomeContent?: HomePageContent | null;
};

const TRUST = [
  { icon: Compass, label: 'East Africa specialists', value: '12+ countries' },
  { icon: Leaf, label: 'Gorilla & wildlife focus', value: 'Since 2010' },
  { icon: Shield, label: 'Licensed tour operator', value: 'Uganda based' },
  { icon: Sparkles, label: 'Tailor-made journeys', value: 'Private & groups' },
];

export default function HomeLandingExperience({
  tours,
  updates,
  countries,
  categories,
  destinationOptions,
  initialHomeContent,
}: Props) {
  const home = useHomePageContent(initialHomeContent);
  const flagship = countries.slice(0, 4);
  const heroImage =
    countryHeroImage('uganda', flagship[0]) ||
    countryHeroImage('kenya', flagship[1]) ||
    '/heroes/uganda.jpg';

  const featured = tours.slice(0, 8);
  const leadUpdate = updates[0];
  const moreUpdates = updates.slice(1, 4);

  return (
    <>
      <section className="relative overflow-hidden bg-[#0c100d] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(0,166,81,0.45), transparent 55%), radial-gradient(circle at 10% 90%, rgba(200,146,42,0.25), transparent 40%)',
          }}
        />
        <div className="relative mx-auto grid max-w-[1240px] gap-10 px-4 py-16 md:grid-cols-12 md:items-center md:py-24 lg:px-6">
          <div className="md:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#c8922a]">Eton Safaris</p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.08] md:text-5xl lg:text-[3.4rem]">
              {home.brandTitle || "Crafted journeys through Africa's wild heart"}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
              {home.brandDescription ||
                'Gorilla forests, golden savannahs, and expert guides — every itinerary built around you, not a template.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tours"
                className="inline-flex items-center gap-2 rounded-full bg-[#00A651] px-7 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#009247]"
              >
                View safaris <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/request-a-quote"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/10"
              >
                Plan my trip
              </Link>
            </div>
          </div>
          <div className="relative md:col-span-5">
            <div className="absolute -right-3 -top-3 h-full w-full rounded-2xl border-2 border-[#c8922a]/60" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl md:aspect-[3/4]">
              <ResponsiveImage
                src={heroImage}
                alt=""
                variant="hero"
                priority
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c100d]/80 via-transparent to-transparent" />
              <p className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white/90">
                Gorilla trekking, migration safaris &amp; conservation-led travel
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-[#0a0d0b]/90">
          <ul className="mx-auto grid max-w-[1240px] grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4 lg:px-6">
            {TRUST.map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#7dd3a0]">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-white/50">{label}</span>
                  <span className="block text-sm font-semibold text-white">{value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="relative z-20 -mt-8 px-4">
        <TourSearchBar tours={tours} categories={categories} destinations={destinationOptions} />
      </div>

      {flagship.length > 0 ? (
        <section className="mx-auto max-w-[1240px] px-4 py-16 lg:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c8922a]">Destinations</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-[#1a1f1c] md:text-4xl">Where we take you</h2>
            </div>
            <Link href="/destinations" className="text-sm font-semibold text-[#00A651] hover:underline">
              All destinations →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4 md:grid-rows-2 md:min-h-[420px]">
            {flagship.map((country, index) => {
              const slug = publicCountrySlug(country) || '';
              const href = destinationPublicPath(slug);
              const tall = index === 0;
              return (
                <Link
                  key={String(country.id ?? slug ?? index)}
                  href={href}
                  className={`group relative overflow-hidden rounded-2xl bg-gray-200 ${
                    tall ? 'md:col-span-2 md:row-span-2 min-h-[240px]' : 'min-h-[180px]'
                  }`}
                >
                  <ResponsiveImage
                    src={countryHeroImage(slug, country)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-serif text-2xl font-bold text-white">
                      {publicCountryLabel(country, slug)}
                    </h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#c8922a]">
                      Explore country
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="bg-[#f4f6f3] py-16">
        <div className="mx-auto max-w-[1240px] px-4 lg:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00A651]">Hand-picked</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-[#1a1f1c]">Signature safaris</h2>
          <div className="mt-8 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((tour, index) => (
              <div key={String(tour.id ?? index)} className="w-[min(100%,280px)] shrink-0 snap-start md:w-[300px]">
                <TourCard tour={tour} durationBadge />
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/tours"
              className="inline-flex rounded-full border-2 border-[#1a1f1c] px-8 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-[#1a1f1c] hover:text-white"
            >
              Browse all packages
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-16 lg:px-6">
        <WhatSetsUsApartSection
          heading={home.setsApartHeading}
          intro={home.setsApartIntro}
          features={home.features}
          videos={home.videos}
        />
      </section>

      {updates.length > 0 ? (
        <section className="border-y border-gray-200 bg-white py-16">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-4 lg:grid-cols-12 lg:px-6">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00A651]">Journal</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-[#1a1f1c]">Safari updates</h2>
              {leadUpdate ? (
                <Link
                  href={`/safari-updates/${publicRecordSlug(leadUpdate) || leadUpdate.id}`}
                  className="group mt-6 block overflow-hidden rounded-2xl border border-gray-100 shadow-sm"
                >
                  {getRecordImage(leadUpdate) ? (
                    <ResponsiveImage
                      src={getRecordImage(leadUpdate) || ''}
                      alt=""
                      className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  ) : null}
                  <div className="p-5">
                    {recordPublishedAt(leadUpdate) ? (
                      <p className="text-xs text-gray-400">{formatPublishedDate(recordPublishedAt(leadUpdate))}</p>
                    ) : null}
                    <h3 className="mt-1 font-serif text-xl font-bold text-[#222] group-hover:text-[#00A651]">
                      {getRecordTitle(leadUpdate)}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                      {stripPublicMoney(pickPlainText(leadUpdate, ['excerpt', 'description', 'content']))}
                    </p>
                  </div>
                </Link>
              ) : null}
            </div>
            <div className="lg:col-span-7">
              <ul className="divide-y divide-gray-100">
                {moreUpdates.map((post, index) => (
                  <li key={String(post.id ?? index)}>
                    <Link
                      href={`/safari-updates/${publicRecordSlug(post) || post.id}`}
                      className="flex gap-4 py-5 hover:bg-[#fafcf9]"
                    >
                      {getRecordImage(post) ? (
                        <ResponsiveImage
                          src={getRecordImage(post) || ''}
                          alt=""
                          className="h-20 w-28 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-20 w-28 shrink-0 rounded-lg bg-gray-100" />
                      )}
                      <span className="min-w-0">
                        <span className="block font-serif text-lg font-semibold text-[#222]">{getRecordTitle(post)}</span>
                        <span className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {stripPublicMoney(recordCardBlurb(post))}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/safari-updates" className="mt-4 inline-block text-sm font-semibold text-[#00A651] hover:underline">
                More stories →
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1240px] px-4 py-12 lg:px-6">
        <PageFaqList faqs={home.faqs || []} tone="light" />
      </section>

      <TestimonialsSection />
      <PaymentsSection />
    </>
  );
}
