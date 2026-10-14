import Link from 'next/link';
import { Star } from 'lucide-react';
import PageFavicon from '@/components/public/PageFavicon';
import { FastCoverImage } from '@/components/public/FastCoverImage';
import type { ReviewSourceBadge } from '@/lib/review-links';

export default function LandingHero({
  title,
  offerLine,
  image,
  ctaHref = '/request-a-quote',
  ctaLabel = 'Request a Quote',
  sources = [],
}: {
  title: string;
  offerLine: string;
  image?: string;
  ctaHref?: string;
  ctaLabel?: string;
  sources?: ReviewSourceBadge[];
}) {
  const badges = sources.length ? sources : [];

  return (
    <section className="relative min-h-[560px] overflow-hidden bg-[#e4efe6] md:min-h-[680px]">
      <PageFavicon title={title} />
      <FastCoverImage src={image} alt="" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/50 to-black/80" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
      <div className="relative z-10 flex min-h-[560px] flex-col items-center justify-center px-4 pb-36 pt-16 text-center md:min-h-[680px] md:pb-40">
        <div className="max-w-5xl rounded-2xl bg-black/35 px-5 py-6 md:px-10 md:py-8">
          <h1
            className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-5xl"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 6px 18px rgba(0,0,0,0.75)' }}
          >
            {title}
          </h1>
          {offerLine ? (
            <p
              className="mt-4 text-sm font-semibold leading-relaxed text-[#ffe082] md:text-lg"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 4px 12px rgba(0,0,0,0.7)' }}
            >
              {offerLine}
            </p>
          ) : null}
        </div>
        <Link
          href={ctaHref}
          className="mt-8 inline-flex rounded-full bg-[#f5c518] px-8 py-3 text-base font-extrabold text-[#111] shadow-[0_4px_0_#c49200] transition hover:bg-[#ffd84d] md:px-10 md:text-lg"
        >
          {ctaLabel} →
        </Link>
      </div>
      {badges.length ? (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-[#072615]/95 py-3">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 text-white">
            {badges?.map((badge) => (
              <TrustBadge key={badge?.id} badge={badge} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TrustBadge({ badge }: { badge: ReviewSourceBadge }) {
  const className =
    'flex items-center gap-2.5 rounded-lg px-2 py-1 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#f5c518]';
  const inner = (
    <>
      <div className="text-left">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#ffe082]">{badge.label}</p>
        <p className="text-base font-extrabold leading-none text-white">{badge.score.toFixed(1)}/5</p>
      </div>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={`h-3.5 w-3.5 ${index < Math.round(badge.score) ? 'fill-[#f5c518] text-[#f5c518]' : 'text-white/35'}`}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium text-white/90">
        {badge.count > 0 ? `Based on ${badge.count}+ reviews` : 'Read reviews'}
      </p>
    </>
  );

  if (badge.external) {
    return (
      <a href={badge.href} target="_blank" rel="noreferrer" className={className} aria-label={`${badge.label} reviews`}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={badge.href} className={className} aria-label={`${badge.label} reviews`}>
      {inner}
    </Link>
  );
}
