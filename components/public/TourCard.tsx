import Link from 'next/link';
import { Clock, Star } from 'lucide-react';
import DavCtaButton from '@/components/public/DavCtaButton';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import {
  formatPublishedDate,
  getRecordImage,
  getRecordTitle,
  pickNumber,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
} from '@/lib/data';
import { stripPublicMoney } from '@/lib/public-money';
import type { RecordRow } from '@/lib/types';

export default function TourCard({
  tour,
  durationBadge = false,
}: {
  tour: RecordRow | null | undefined;
  durationBadge?: boolean;
}) {
  if (!tour) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-white p-4 shadow-sm opacity-60">
        <p className="text-sm text-gray-500">Tour unavailable</p>
      </div>
    );
  }
  const slug = publicRecordSlug(tour);
  if (!slug) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-white p-4 shadow-sm opacity-60">
        <p className="text-sm text-gray-500">Tour unavailable</p>
      </div>
    );
  }
  const days = pickNumber(tour, ['duration_days', 'days', 'duration']);
  const nights = days > 0 ? Math.max(days - 1, 0) : 0;
  const image = getRecordImage(tour);
  const tourTitle = getRecordTitle(tour);
  const country = pickString(tour, ['country']);
  const quoteParams = new URLSearchParams({ tour: tourTitle });
  if (country) quoteParams.set('destination', country);
  const quoteHref = `/request-a-quote?${quoteParams.toString()}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/tours/${slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {image ? (
            <ResponsiveImage
              src={image}
              alt={tourTitle}
              variant="card"
              width={640}
              height={480}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
          )}
          {durationBadge && days > 0 ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-[#006400]/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              <Clock className="h-3 w-3" /> {days} DAYS
            </span>
          ) : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/tours/${slug}`} className="block">
          <h3 className="public-article-body text-[15px] font-bold leading-snug text-[#111]">{tourTitle}</h3>
          {formatPublishedDate(tour) ? (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#00A651]">
              {formatPublishedDate(tour)}
            </p>
          ) : null}
          {!durationBadge && days > 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#00A651]">
              <Clock className="h-3.5 w-3.5" /> {days} DAYS - {nights} NIGHTS
            </p>
          ) : null}
          <p className="mt-2 line-clamp-2 public-article-body text-[13px] leading-relaxed text-[#555]">
            {stripPublicMoney(recordCardBlurb(tour))}
          </p>
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-3.5 w-3.5 fill-none text-[#222]" strokeWidth={1.6} />
            ))}
          </div>
          <Link href={quoteHref} className="shrink-0" prefetch>
            <DavCtaButton>Request a Quote</DavCtaButton>
          </Link>
        </div>
      </div>
    </article>
  );
}
