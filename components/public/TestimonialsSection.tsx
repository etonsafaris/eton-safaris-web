'use client';

import { useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import Carousel from '@/components/public/Carousel';
import { fetchCollectionRecords, pickNumber, pickStoredString, pickString } from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';
import { isWebsiteReview, reviewClickHref } from '@/lib/review-links';
import { linkedReviewPlatforms, REVIEW_PLATFORM_FIELDS } from '@/lib/home-page-content';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import ReviewPlatformLogo from '@/components/public/ReviewPlatformLogo';
import type { RecordRow } from '@/lib/types';

function reviewAuthor(review: RecordRow) {
  return (
    pickStoredString(review, ['author', 'guest_name', 'name']) ||
    pickString(review, ['author', 'guest_name', 'name']) ||
    'Safari Guest'
  );
}

function reviewCountry(review: RecordRow) {
  return (
    pickStoredString(review, ['country', 'country_of_residence', 'residence', 'nationality']) ||
    pickString(review, ['country', 'country_of_residence', 'residence', 'nationality'])
  );
}

function reviewNote(review: RecordRow) {
  return (
    pickStoredString(review, ['content', 'review', 'message', 'experience']) ||
    pickString(review, ['content', 'review', 'message', 'experience']) ||
    'A memorable safari with Eton Safaris.'
  );
}

export default function TestimonialsSection() {
  const live = useCmsLive();
  const home = useHomePageContent();
  const platforms = linkedReviewPlatforms(home);
  const [reviews, setReviews] = useState<RecordRow[]>([]);

  useEffect(() => {
    fetchCollectionRecords('reviews')
      .then((siteReviews) => {
        // Website reviews with a guest name first so name + country of residence are visible.
        const sorted = siteReviews.slice().sort((a, b) => {
          const aWeb = isWebsiteReview(a) ? 0 : 1;
          const bWeb = isWebsiteReview(b) ? 0 : 1;
          if (aWeb !== bWeb) return aWeb - bWeb;
          return 0;
        });
        setReviews(sorted);
      })
      .catch((error) => console.error('[Supabase] Failed to load testimonials:', error));
  }, [live]);

  const items = (reviews ?? [])?.map((review, index) => {
    const rating = pickNumber(review, ['rating'], 5);
    const author = reviewAuthor(review);
    const country = reviewCountry(review);
    const content = reviewNote(review);
    const source = pickString(review, ['source']) || 'Website';
    const website = isWebsiteReview(review);
    const href = reviewClickHref(review);
    const className =
      'block h-full rounded-lg bg-white/5 p-6 backdrop-blur-sm md:p-10' +
      (href ? ' cursor-pointer transition-colors hover:bg-white/10' : ' cursor-default');

    const inner = (
      <>
        <div className="mb-3 flex items-center justify-between">
          <Quote className="h-8 w-8 text-sage/40" />
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, starIndex) => (
              <Star
                key={starIndex}
                className={`h-4 w-4 ${starIndex < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-[#1c1915]/20'}`}
              />
            ))}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[#3f3830] md:text-base">&ldquo;{content}&rdquo;</p>
        <div className="mt-6 space-y-1">
          <p className="font-semibold text-[#1c1915]">{author}</p>
          {website ? (
            <p className="text-xs uppercase tracking-widest text-sage">
              {country ? country : 'Country of residence not provided'}
            </p>
          ) : (
            <>
              {country ? (
                <p className="text-xs uppercase tracking-widest text-sage">{country}</p>
              ) : null}
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a5a2b]">{source}</p>
            </>
          )}
          {href ? (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a5a2b]">View on {source} →</p>
          ) : null}
        </div>
      </>
    );

    if (href) {
      return (
        <a
          key={String(review.id ?? index)}
          href={href}
          target="_blank"
          rel="noreferrer"
          className={className}
          aria-label={`Read ${author}'s review on ${source}`}
        >
          {inner}
        </a>
      );
    }

    return (
      <div key={String(review.id ?? index)} className={className}>
        {inner}
      </div>
    );
  });

  if (!reviews.length && !platforms.length) {
    return null;
  }

  return (
    <section className="border-y border-[#d9d2c5] bg-[#f6f1e8] py-14 text-[#1c1915] md:py-20">
      <div className="mx-auto max-w-[900px] px-4 md:px-6">
        <div className="mb-8 border-l-2 border-[#1c1915] pl-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a5a2b]">From the road</p>
          <h2 className="font-serif text-2xl font-medium md:text-3xl">Notes from travellers</h2>
        </div>
        {platforms.length ? (
          <div className="mb-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {platforms.map((platform) => {
              const label = REVIEW_PLATFORM_FIELDS.find((item) => item.id === platform.id)?.label || platform.id;
              return (
                <a
                  key={platform.id}
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 text-[#1c1915] hover:text-[#8a5a2b]"
                  title={`${label} Reviews`}
                  aria-label={`${label} Reviews, 4.9 out of 5`}
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f5c518]">
                    <ReviewPlatformLogo id={platform.id} className="h-8 w-8" />
                  </span>
                  <span className="text-left">
                    <span className="flex items-center gap-2">
                      <span className="text-[22px] font-extrabold leading-none tracking-tight">4.9/5</span>
                      <span className="inline-flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <Star key={starIndex} className="h-4 w-4 fill-[#f5c518] text-[#f5c518]" />
                        ))}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm underline decoration-white underline-offset-2">
                      {label} Reviews
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        ) : null}
        {reviews.length ? <Carousel items={items} itemsPerView={{ sm: 1, md: 1, lg: 1 }} /> : null}
      </div>
    </section>
  );
}
