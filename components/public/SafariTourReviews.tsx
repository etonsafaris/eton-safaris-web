'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star, X } from 'lucide-react';
import Carousel from '@/components/public/Carousel';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, isPublishedRecord, pickNumber, pickString } from '@/lib/data';
import { reviewExternalHref } from '@/lib/review-links';
import { matchesCountry } from '@/lib/country-utils';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

const FALLBACKS: RecordRow[] = [
  {
    title: 'Highly recommended safari',
    content: 'Guides were professional, the itinerary was well paced, and wildlife viewing exceeded our expectations.',
    author: 'FILIPPO M',
    rating: 5,
    source: 'Website',
  },
  {
    title: 'Unforgettable gorilla trekking',
    content: 'Permits, lodges, and transfers were handled smoothly. A lifetime encounter with mountain gorillas.',
    author: 'SARAH K',
    rating: 5,
    source: 'Website',
  },
  {
    title: 'Excellent local operator',
    content: 'Clear communication before travel and a mechanically sound safari vehicle throughout the trip.',
    author: 'JAMES R',
    rating: 5,
    source: 'Website',
  },
  {
    title: 'Would book again',
    content: 'Tailor-made days, honest advice on parks, and a team that cared about our comfort and timing.',
    author: 'ANNA L',
    rating: 5,
    source: 'Website',
  },
];

function reviewBody(review: RecordRow) {
  return pickString(review, ['content', 'review', 'message', 'excerpt']) || 'A memorable safari with Eton Safaris.';
}

function reviewAuthor(review: RecordRow) {
  return pickString(review, ['author', 'guest_name', 'name']) || 'Safari Guest';
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex">
      {Array.from({ length: 5 }).map((_, star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({
  review,
  countryName,
  onReadMore,
}: {
  review: RecordRow;
  countryName: string;
  onReadMore: () => void;
}) {
  const rating = pickNumber(review, ['rating'], 5);
  const author = reviewAuthor(review);
  const title = getRecordTitle(review) || `Highly recommended ${countryName} Safaris`;
  const body = reviewBody(review);
  const photo = getRecordImage(review);

  return (
    <article className="flex h-full w-full flex-col rounded-xl border border-[#c8e6c9] bg-white p-5 shadow-sm">
      <h4 className="public-article-body text-[17px] font-bold italic text-[#111]">&ldquo;{title}&rdquo;</h4>
      <div className="mt-2 flex items-center gap-2">
        <ReviewStars rating={rating} />
        <span className="text-sm font-semibold text-[#333]">{rating} /5</span>
      </div>
      <p className="public-article-body mt-3 line-clamp-3 text-sm leading-relaxed text-[#444]">{body}</p>
      <button
        type="button"
        onClick={onReadMore}
        className="mt-2 self-start text-sm font-semibold text-[#00A651] hover:underline"
      >
        Read More
      </button>
      <div className="mt-auto flex items-center gap-3 pt-4">
        {photo ? (
          <img src={photo} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A651] text-sm font-bold text-white">
            {author.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-bold uppercase text-[#111]">{author}</p>
          <p className="text-xs text-gray-500">Tourist</p>
        </div>
      </div>
    </article>
  );
}

export default function SafariTourReviews({ countrySlug, countryName }: { countrySlug: string; countryName: string }) {
  const live = useCmsLive();
  const [reviews, setReviews] = useState<RecordRow[]>([]);
  const [open, setOpen] = useState<RecordRow | null>(null);

  useEffect(() => {
    fetchCollectionRecords('reviews')
      .then((rows) => {
        const published = rows.filter(isPublishedRecord);
        const filtered = published.filter((review) => matchesCountry(review, countrySlug));
        const pool = filtered.length ? filtered : published;
        setReviews(pool.length ? pool.slice(0, 24) : FALLBACKS);
      })
      .catch(() => setReviews(FALLBACKS));
  }, [countrySlug, live]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const items = useMemo(
    () =>
      reviews.map((review, index) => (
        <ReviewCard
          key={String(review.id ?? index)}
          review={review}
          countryName={countryName}
          onReadMore={() => setOpen(review)}
        />
      )),
    [reviews, countryName]
  );

  const originalHref = open ? reviewExternalHref(open) : '';
  const hasOriginal = Boolean(originalHref && /^https?:/i.test(originalHref) && open?.id);

  return (
    <section id="safari-reviews" className="scroll-mt-24 bg-white px-4 py-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="dav-amazing-title">
          <h3>Safari Tour Reviews</h3>
          <span className="dav-amazing-underline dav-amazing-underline-up" />
        </div>
        <div className="mt-10">
          <Carousel
            items={items}
            autoPlayMs={5000}
            itemsPerView={{ sm: 1, md: 2, lg: 4 }}
            paused={Boolean(open)}
            pauseOnHover
          />
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h4 id="review-dialog-title" className="public-article-body text-xl font-bold italic text-[#111]">
                &ldquo;{getRecordTitle(open) || `Highly recommended ${countryName} Safaris`}&rdquo;
              </h4>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close review" className="rounded-full p-1 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ReviewStars rating={pickNumber(open, ['rating'], 5)} />
              <span className="text-sm font-semibold text-[#333]">{pickNumber(open, ['rating'], 5)} /5</span>
            </div>
            <p className="public-article-body mt-4 text-[16px] leading-relaxed text-[#333]">{reviewBody(open)}</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A651] text-sm font-bold text-white">
                {reviewAuthor(open).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold uppercase text-[#111]">{reviewAuthor(open)}</p>
                <p className="text-xs text-gray-500">Tourist{pickString(open, ['source']) ? ` · ${pickString(open, ['source'])}` : ''}</p>
              </div>
            </div>
            {hasOriginal ? (
              <a
                href={originalHref}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex text-sm font-semibold text-[#00A651] hover:underline"
              >
                View original review
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
