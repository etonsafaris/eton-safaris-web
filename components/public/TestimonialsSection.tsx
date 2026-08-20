'use client';



import { useEffect, useState } from 'react';

import { Quote, Star } from 'lucide-react';

import Carousel from '@/components/public/Carousel';

import { fetchCollectionRecords, getRecordTitle, pickNumber, pickString } from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';

import { reviewExternalHref } from '@/lib/review-links';

import type { RecordRow } from '@/lib/types';



export default function TestimonialsSection() {

  const live = useCmsLive();

  const [reviews, setReviews] = useState<RecordRow[]>([]);



  useEffect(() => {

    fetchCollectionRecords('reviews')

      .then(setReviews)

      .catch((error) => console.error('[Supabase] Failed to load testimonials:', error));

  }, [live]);



  const items = reviews

    .filter((review) => {

      const source = pickString(review, ['source']).toLowerCase();

      return source !== 'google' && source !== 'booking.com';

    })

    .map((review, index) => {

      const rating = pickNumber(review, ['rating'], 5);

      const author = pickString(review, ['author', 'guest_name', 'name']) || 'Safari Guest';

      const content = pickString(review, ['content', 'review', 'message', 'title']);

      const source = pickString(review, ['source'], 'Website');

      const href = reviewExternalHref(review);



      return (

        <a

          key={String(review.id ?? index)}

          href={href}

          target="_blank"

          rel="noreferrer"

          className="block h-full cursor-pointer rounded-lg bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10 md:p-10"

          aria-label={`Read ${author}'s review on ${source}`}

        >

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

            &ldquo;{content || getRecordTitle(review)}&rdquo;

          </p>

          <div className="mt-6">

            <p className="font-semibold text-white">{author}</p>

            <p className="text-xs uppercase tracking-widest text-sage">{source}</p>

            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">View on {source} →</p>

          </div>

        </a>

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


