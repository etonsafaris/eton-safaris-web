'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import LandingHero from '@/components/public/LandingHero';
import LandingReadyBanner from '@/components/public/LandingReadyBanner';
import PageFaqList from '@/components/public/PageFaqList';
import SafariTourReviews from '@/components/public/SafariTourReviews';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import { landingConversionCopy, landingVisibleH1 } from '@/lib/landing-page-copy';
import { mergeFaqs } from '@/lib/default-faqs';
import { bestFaqsFor, limitFaqs } from '@/lib/best-faqs';
import { countryPlacePath } from '@/lib/cms-routes';
import { SITE } from '@/lib/collections';
import { countryHeroImage } from '@/lib/country-heroes';
import { quoteRequestPath } from '@/lib/quote-request';
import { reviewSourceBadges } from '@/lib/review-links';
import {
  fetchCollectionRecords,
  fetchParksForCountry,
  fetchToursForCountryLabel,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickString,
  publicRecordSlug,
} from '@/lib/data';
import { publicBodyHtml } from '@/lib/embedded-content';
import { matchesCountry, publicCountryLabel } from '@/lib/country-utils';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

type LandingPageContentProps = {
  slug: string;
  country: RecordRow | null;
  landing?: RecordRow | null;
  heroTitle?: string;
};

function toProseHtml(value: string) {
  const cleaned = publicBodyHtml(value).trim();
  if (!cleaned) return '';
  if (/<[a-z][\s\S]*>/i.test(cleaned)) return cleaned;
  return cleaned
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export default function LandingPageContent({ slug, country, landing, heroTitle }: LandingPageContentProps) {
  const live = useCmsLive();
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [reviews, setReviews] = useState<RecordRow[]>([]);
  const [parks, setParks] = useState<RecordRow[]>([]);
  const [places, setPlaces] = useState<RecordRow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [countryTours, allReviews, countryParks, countryPlaces] = await Promise.all([
          fetchToursForCountryLabel(slug, 48),
          fetchCollectionRecords('reviews').catch(() => []),
          fetchParksForCountry(slug, 24).catch(() => []),
          fetchCollectionRecords('explore', [], { maxRows: 48 }).catch(() => []),
        ]);
        setTours(countryTours.filter((tour) => matchesCountry(tour, slug)));
        setReviews(allReviews);
        setParks(countryParks.filter(isPublishedRecord).filter((park) => matchesCountry(park, slug)).slice(0, 8));
        setPlaces(countryPlaces.filter(isPublishedRecord).filter((place) => matchesCountry(place, slug)).slice(0, 8));
      } catch (error) {
        console.error('[Landing] Failed to load country landing data:', error);
      } finally {
        setReady(true);
      }
    }
    load();
  }, [slug, live]);

  const countryName = publicCountryLabel(country, slug);
  const copy = landingConversionCopy(slug, countryName);
  const extras = parseCmsPageExtras(landing, slug);
  const h1 = landingVisibleH1(slug, countryName, extras.hero_title || heroTitle || '');
  const offerLine = extras.offer_line || copy.offerLine;
  const readyHeading = extras.ready_heading || copy.readyHeading;
  const ctaLabel = extras.cta_label || 'Request a Quote';
  const ctaHref =
    extras.cta_href && (extras.cta_href.startsWith('/') || /^https?:\/\//i.test(extras.cta_href)) && !extras.cta_href.includes('contact')
      ? extras.cta_href
      : quoteRequestPath({ country: countryName });
  const image = getRecordImage(landing || {}) || countryHeroImage(slug, country);
  const faqs = limitFaqs(mergeFaqs(extras.faqs, copy.faqs), bestFaqsFor('country', { countrySlug: slug, countryName }));
  const excerptText = extras.excerpt.replace(/<[^>]+>/g, ' ').trim();
  const articleHtml = toProseHtml(excerptText.length >= 40 && excerptText.length < 700 ? extras.excerpt : copy.seoIntro);
  const sources = useMemo(() => reviewSourceBadges(reviews), [reviews]);

  return (
    <>
      <LandingHero
        title={h1}
        offerLine={offerLine}
        image={image}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        sources={sources}
      />

      <section className="bg-white">
        <AmazingSafaris
          tours={tours}
          title={copy.toursHeading}
          columns={3}
          emptyMessage={
            ready
              ? `No ${countryName} safari tours published yet. Request a quote and we will tailor one.`
              : undefined
          }
        />
      </section>

      {articleHtml ? (
        <section className="bg-[#fafafa] px-4 py-10">
          <div className="mx-auto max-w-4xl">
            <div className="public-prose" dangerouslySetInnerHTML={{ __html: articleHtml }} />
            <p className="public-article-body mt-4 text-[16px] leading-relaxed text-[#333]">
              Browse{' '}
              <Link href="/tours" className="font-semibold text-[#00A651] hover:underline">
                safari tours
              </Link>
              , request a{' '}
              <Link href={ctaHref} className="font-semibold text-[#00A651] hover:underline">
                tailor-made quote
              </Link>
              , or speak with our Uganda-based team about permits and lodges.
            </p>
            {parks.length || places.length ? (
              <div className="mt-6">
                <h2 className="public-article-body text-xl font-bold text-[#111]">
                  Popular {countryName} parks and places
                </h2>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {parks.map((park) => {
                    const parkSlug = publicRecordSlug(park);
                    return (
                      <li key={String(park.id || parkSlug)}>
                        <Link href={parkSlug ? `/parks/${parkSlug}` : '/parks'} className="text-[#00A651] hover:underline">
                          {getRecordTitle(park)}
                        </Link>
                      </li>
                    );
                  })}
                  {places.map((place) => (
                    <li key={String(place.id || publicRecordSlug(place))}>
                      <Link href={countryPlacePath(slug, place)} className="text-[#00A651] hover:underline">
                        {getRecordTitle(place)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <PageFaqList faqs={faqs} tone="light" />
          </div>
        </section>
      ) : faqs.length ? (
        <section className="bg-[#fafafa] px-4 py-10">
          <div className="mx-auto max-w-4xl">
            <PageFaqList faqs={faqs} tone="light" />
          </div>
        </section>
      ) : null}

      <SafariTourReviews countrySlug={slug} countryName={countryName} />
      <LandingReadyBanner heading={readyHeading} ctaHref={ctaHref} ctaLabel={ctaLabel} />
    </>
  );
}
