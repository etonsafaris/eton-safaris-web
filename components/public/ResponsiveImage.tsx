'use client';

import Image from 'next/image';
import { useState } from 'react';
import { DEFAULT_COUNTRY_HERO } from '@/lib/country-heroes';
import { COUNTRY_IMAGE_DIMENSIONS, OFFICIAL_COMMUNITY_HERO_PATHS } from '@/lib/official-country-assets';
import { IMAGE_BLUR_DATA_URL } from '@/lib/static-build';
import { resolvePublicImage } from '@/lib/public-image';
import { cardImageSrc, countryDestinationCardSrc, heroImageSrc } from '@/lib/responsive-image';
import { SITE_MEDIA } from '@/lib/site-media';

type ResponsiveImageProps = {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  variant?: 'hero' | 'card';
  width?: number;
  height?: number;
  /** When false, do not swap to Kenya hero / stock on load errors (tour CMS covers). */
  useErrorFallback?: boolean;
};

const HERO_FALLBACK = SITE_MEDIA.communityHero || OFFICIAL_COMMUNITY_HERO_PATHS[0];
const CARD_FALLBACK = DEFAULT_COUNTRY_HERO;

export default function ResponsiveImage({
  src,
  alt = '',
  className,
  sizes,
  priority = false,
  quality,
  variant = 'card',
  width,
  height,
  useErrorFallback = true,
}: ResponsiveImageProps) {
  const resolved = resolvePublicImage(src);
  const [displaySrc, setDisplaySrc] = useState(resolved || '');
  if (!resolved) return null;

  const heroQuality = quality ?? 85;
  const isHomeDestination =
    variant === 'card' && width === COUNTRY_IMAGE_DIMENSIONS.homeDestination.width;
  const optimizedSrc =
    variant === 'hero'
      ? heroImageSrc(displaySrc, heroQuality)
      : isHomeDestination
        ? countryDestinationCardSrc(displaySrc)
        : cardImageSrc(displaySrc);

  const dims =
    variant === 'hero'
      ? COUNTRY_IMAGE_DIMENSIONS.countryHero
      : isHomeDestination
        ? COUNTRY_IMAGE_DIMENSIONS.homeDestination
        : COUNTRY_IMAGE_DIMENSIONS.countryCard;
  const imgWidth = width ?? dims.width;
  const imgHeight = height ?? dims.height;
  const motionClass = variant === 'hero' ? 'hero-motion' : '';
  const useFill = variant === 'hero' || className?.includes('absolute');
  const unoptimized = displaySrc.startsWith('/api/media/');

  const shared = {
    alt,
    priority,
    quality: heroQuality,
    placeholder: 'blur' as const,
    blurDataURL: IMAGE_BLUR_DATA_URL,
    sizes: sizes || (variant === 'hero' ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'),
    unoptimized,
    onError: () => {
      if (!useErrorFallback) return;
      const fallback = variant === 'hero' ? HERO_FALLBACK : CARD_FALLBACK;
      if (displaySrc !== fallback) setDisplaySrc(fallback);
    },
  };

  if (useFill) {
    return (
      <div className={['relative h-full w-full overflow-hidden', motionClass].filter(Boolean).join(' ')}>
        <Image
          {...shared}
          src={optimizedSrc}
          fill
          className={['object-cover', className?.replace('absolute inset-0', '').trim()].filter(Boolean).join(' ')}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </div>
    );
  }

  return (
    <Image
      {...shared}
      src={optimizedSrc}
      width={imgWidth}
      height={imgHeight}
      className={[className, motionClass].filter(Boolean).join(' ')}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
