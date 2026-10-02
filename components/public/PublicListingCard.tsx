'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { COUNTRY_IMAGE_DIMENSIONS } from '@/lib/official-country-assets';
import { stripPublicMoney } from '@/lib/public-money';
import {
  DEFAULT_PUBLIC_IMAGE,
  DEFAULT_SAFARI_FALLBACK_IMAGE,
  publicImageSrcOrFallback,
  resolvePublicImage,
} from '@/lib/public-image';
import { IMAGE_BLUR_DATA_URL } from '@/lib/static-build';

export default function PublicListingCard({
  href,
  image,
  title,
  date,
  location,
  description,
  cta = 'Read More',
  onNavigate,
}: {
  href: string;
  image?: string;
  title: string;
  date?: string;
  location?: string;
  description?: string;
  cta?: string;
  onNavigate?: () => void;
}) {
  const resolved = image ? publicImageSrcOrFallback(resolvePublicImage(image) || image) : '';
  const [cardImage, setCardImage] = useState(resolved);

  useEffect(() => {
    setCardImage(image ? publicImageSrcOrFallback(resolvePublicImage(image) || image) : '');
  }, [image]);

  const copy = typeof description === 'string' ? stripPublicMoney(description) : '';
  const to = typeof href === 'string' && href.trim() ? href : '/';
  const { width, height } = COUNTRY_IMAGE_DIMENSIONS.tourCard;
  const unoptimized = cardImage.startsWith('/api/media/');

  return (
    <Link
      href={to}
      onClick={() => onNavigate?.()}
      className="group flex h-full flex-col overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {cardImage ? (
          <Image
            src={cardImage}
            alt={title || ''}
            width={width}
            height={height}
            quality={85}
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_DATA_URL}
            unoptimized={unoptimized}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={() => {
              if (cardImage === DEFAULT_SAFARI_FALLBACK_IMAGE) {
                setCardImage(DEFAULT_PUBLIC_IMAGE);
                return;
              }
              if (cardImage === DEFAULT_PUBLIC_IMAGE) {
                setCardImage('');
                return;
              }
              setCardImage(DEFAULT_SAFARI_FALLBACK_IMAGE);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {date ? (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#00A651]">{date}</p>
        ) : null}
        <h2 className="text-[15px] font-bold leading-snug text-[#111]">{title}</h2>
        {location ? (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#00A651]">{location}</p>
        ) : null}
        {copy ? <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#555]">{copy}</p> : null}
        <div className="mt-auto pt-4">
          <span className="dav-cta">{cta}</span>
        </div>
      </div>
    </Link>
  );
}
