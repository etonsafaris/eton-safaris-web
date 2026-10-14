'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { COUNTRY_IMAGE_DIMENSIONS } from '@/lib/official-country-assets';
import {
  publicImagePlaceholderArt,
  resolvePublicHeroCarouselImage,
  resolvePublicRecordImageSrc,
} from '@/lib/public-image';
import { cardImageSrc, countryDestinationCardSrc, heroImageSrc } from '@/lib/responsive-image';

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
  /** When true, broken URLs show bundled safari art instead of an empty box. */
  useErrorFallback?: boolean;
};

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
  const resolvedSrc = useMemo(() => {
    if (variant === 'hero') {
      return resolvePublicHeroCarouselImage(src) || resolvePublicRecordImageSrc(src) || String(src || '').trim();
    }
    return resolvePublicRecordImageSrc(src) || '';
  }, [src, variant]);
  const [errorArt, setErrorArt] = useState(false);
  useEffect(() => {
    setErrorArt(false);
  }, [resolvedSrc]);
  const displaySrc = errorArt && useErrorFallback ? publicImagePlaceholderArt() : resolvedSrc;

  if (!displaySrc) return null;

  const resolvedQuality = variant === 'hero' ? (quality ?? 58) : quality;
  const isHomeDestination =
    variant === 'card' && width === COUNTRY_IMAGE_DIMENSIONS.homeDestination.width;
  const optimizedSrc =
    variant === 'hero'
      ? heroImageSrc(displaySrc, resolvedQuality ?? 85)
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
  // Fill only when the parent is a sized frame. A hero variant inside a card
  // (h-[220px]) must keep its own height, or the photo collapses to nothing.
  const useFill =
    Boolean(className?.includes('absolute')) ||
    (variant === 'hero' && Boolean(className?.includes('h-full')) && !/h-\[\d/.test(className || ''));
  // hero-motion is position:absolute. That is only safe inside a sized hero frame.
  const motionClass = useFill ? 'hero-motion' : '';
  const unoptimized =
    displaySrc.startsWith('/api/media/') ||
    displaySrc.includes('images.unsplash.com') ||
    displaySrc.startsWith('/heroes/');

  const shared = {
    alt: alt || '',
    priority,
    ...(resolvedQuality != null ? { quality: resolvedQuality } : {}),
    sizes: sizes || (variant === 'hero' ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'),
    unoptimized,
    onError: () => {
      if (useErrorFallback) setErrorArt(true);
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
