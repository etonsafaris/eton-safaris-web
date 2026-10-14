'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FAST_HERO_UNDERLAY, FastCoverImage } from '@/components/public/FastCoverImage';
import { LANDING_READY_IMAGES } from '@/lib/landing-page-copy';

export default function LandingReadyBanner({
  heading,
  images = LANDING_READY_IMAGES,
  ctaHref = '/request-a-quote',
  ctaLabel = 'Request a Quote',
}: {
  heading: string;
  images?: string[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const slides = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const current = slides[index] || slides[0];

  return (
    <section className="bg-white pb-16">
      <div className="mx-auto max-w-[1100px] px-4 pt-10 text-center">
        {slides.length > 1 ? (
          <div className="mb-5 flex justify-center gap-2">
            {slides.map((_, dot) => (
              <button
                key={dot}
                type="button"
                aria-label={`Slide ${dot + 1}`}
                onClick={() => setIndex(dot)}
                className={`h-2.5 w-2.5 rounded-full ${dot === index ? 'bg-[#1b5e20]' : 'bg-[#81c784]'}`}
              />
            ))}
          </div>
        ) : null}
        <h2 className="public-article-body text-[26px] italic text-[#00A651] md:text-[32px]">{heading}</h2>
      </div>
      <div
        className="relative mt-6 min-h-[320px] overflow-hidden bg-[#e4efe6] md:min-h-[420px]"
        style={{
          backgroundImage: `url("${FAST_HERO_UNDERLAY}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <FastCoverImage src={current} alt="" />
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10 flex min-h-[320px] items-center justify-center md:min-h-[420px]">
          <Link
            href={ctaHref}
            className="inline-flex rounded-full bg-[#f0c14b] px-10 py-3 text-base font-semibold text-[#111] shadow-md hover:bg-[#e6b33a]"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
