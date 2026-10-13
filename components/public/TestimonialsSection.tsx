'use client';

import { useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import Carousel from '@/components/public/Carousel';
import { fetchCollectionRecords, pickNumber, pickStoredString, pickString } from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';
import { isWebsiteReview, reviewClickHref } from '@/lib/review-links';
import { linkedReviewPlatforms, REVIEW_PLATFORM_FIELDS, type ReviewPlatformId } from '@/lib/home-page-content';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import type { RecordRow } from '@/lib/types';

function PlatformMark({ id }: { id: ReviewPlatformId }) {
  if (id === 'google') {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
        <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7C21.7 18.7 23 15.8 23 12.3z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.2-6.9-5.1H1.3v3c2 4 6.1 6.7 10.7 6.7z" />
        <path fill="#FBBC05" d="M5.1 14.3A7.2 7.2 0 0 1 4.7 12c0-.8.1-1.6.4-2.3v-3H1.3A12 12 0 0 0 0 12c0 1.9.5 3.8 1.3 5.3l3.8-3z" />
        <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.3 2.7 1.3 6.7l3.8 3C6.1 7 8.8 4.8 12 4.8z" />
      </svg>
    );
  }
  if (id === 'tripadvisor') {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
        <circle cx="8" cy="12" r="4.2" fill="#00AF87" />
        <circle cx="16" cy="12" r="4.2" fill="#00AF87" />
        <circle cx="8" cy="12" r="1.6" fill="#1a1a1a" />
        <circle cx="16" cy="12" r="1.6" fill="#1a1a1a" />
      </svg>
    );
  }
  return <span className="text-sm font-black tracking-tight text-[#1a1a1a]">SB</span>;
}

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
      .then((rows) => {
        // Website reviews with a guest name first so name + country of residence are visible.
        const sorted = rows.slice().sort((a, b) => {
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
                className={`h-4 w-4 ${starIndex < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`}
              />
            ))}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-white/80 md:text-base">&ldquo;{content}&rdquo;</p>
        <div className="mt-6 space-y-1">
          <p className="font-semibold text-white">{author}</p>
          {website ? (
            <p className="text-xs uppercase tracking-widest text-sage">
              {country ? country : 'Country of residence not provided'}
            </p>
          ) : (
            <>
              {country ? (
                <p className="text-xs uppercase tracking-widest text-sage">{country}</p>
              ) : null}
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">{source}</p>
            </>
          )}
          {href ? (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">View on {source} →</p>
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
    <section className="bg-forest py-14 text-white md:py-20">
      <div className="mx-auto max-w-[900px] px-4 md:px-6">
        {platforms.length ? (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-8">
            {platforms.map((platform) => {
              const label = REVIEW_PLATFORM_FIELDS.find((item) => item.id === platform.id)?.label || platform.id;
              return (
                <a
                  key={platform.id}
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 text-white hover:text-white"
                  aria-label={`Read more ${label} reviews`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5c518]">
                    <PlatformMark id={platform.id} />
                  </span>
                  <span className="text-left">
                    <span className="block text-lg font-bold leading-tight">{label}</span>
                    <span className="block text-sm underline decoration-white/80 underline-offset-2">Read more reviews</span>
                  </span>
                </a>
              );
            })}
          </div>
        ) : null}
        {reviews.length ? (
          <>
            <div className="mb-8 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sage">Testimonials</p>
              <h2 className="font-serif text-2xl font-bold md:text-3xl">What Our Clients Say</h2>
            </div>
            <Carousel items={items} itemsPerView={{ sm: 1, md: 1, lg: 1 }} />
          </>
        ) : null}
      </div>
    </section>
  );
}
