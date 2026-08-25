'use client';

import { useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import Carousel from '@/components/public/Carousel';
import { fetchCollectionRecords, pickNumber, pickString } from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';
import { isWebsiteReview, reviewClickHref } from '@/lib/review-links';
import type { RecordRow } from '@/lib/types';

export default function TestimonialsSection() {
  const live = useCmsLive();
  const [reviews, setReviews] = useState<RecordRow[]>([]);

  useEffect(() => {
    fetchCollectionRecords('reviews')
      .then(setReviews)
      .catch((error) => console.error('[Supabase] Failed to load testimonials:', error));
  }, [live]);

  const items = reviews.map((review, index) => {
    const rating = pickNumber(review, ['rating'], 5);
    const author = pickString(review, ['author', 'guest_name', 'name']) || 'Safari Guest';
    const country = pickString(review, ['country', 'country_of_residence', 'residence']);
    const content = pickString(review, ['content', 'review', 'message']);
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
        <p className="text-sm leading-relaxed text-white/80 md:text-base">
          &ldquo;{content || 'A memorable safari with Eton Safaris.'}&rdquo;
        </p>
        <div className="mt-6">
          <p className="font-semibold text-white">{author}</p>
          <p className="text-xs uppercase tracking-widest text-sage">
            {website ? country || 'Website guest' : country || source}
          </p>
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

  return (
    <section className="bg-forest py-14 text-white md:py-20">
      <div className="mx-auto max-w-[900px] px-4 md:px-6">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sage">Testimonials</p>
          <h2 className="font-serif text-2xl font-bold md:text-3xl">What Our Clients Say</h2>
        </div>
        <Carousel
          items={items}
          itemsPerView={{ sm: 1, md: 1, lg: 1 }}
          emptyMessage="No testimonials found in this collection."
        />
      </div>
    </section>
  );
}
