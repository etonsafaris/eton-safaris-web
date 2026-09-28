'use client';

import { useEffect, useState } from 'react';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import { countryHeroRemoteFallback } from '@/lib/country-hero-fallback';
import { COUNTRY_IMAGE_DIMENSIONS } from '@/lib/official-country-assets';
import { resolvePublicImage } from '@/lib/public-image';

type HomePageImageProps = {
  src: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
  variant?: 'hero' | 'card';
  sizes?: string;
  width?: number;
  height?: number;
};

/** Home sections: CMS (https) and local `/heroes` — one code path, no blank Next/Image 404s. */
export default function HomePageImage({
  src,
  alt = '',
  className,
  priority = false,
  quality,
  variant = 'card',
  sizes,
  width,
  height,
}: HomePageImageProps) {
  const normalized = resolvePublicImage(src) || countryHeroRemoteFallback('kenya');
  const [displaySrc, setDisplaySrc] = useState(normalized);
  useEffect(() => {
    setDisplaySrc(resolvePublicImage(src) || countryHeroRemoteFallback('kenya'));
  }, [src]);
  if (!displaySrc) return null;
  const isHomeDestination = width === COUNTRY_IMAGE_DIMENSIONS.homeDestination.width;
  const dims =
    variant === 'hero'
      ? COUNTRY_IMAGE_DIMENSIONS.countryHero
      : isHomeDestination
        ? COUNTRY_IMAGE_DIMENSIONS.homeDestination
        : COUNTRY_IMAGE_DIMENSIONS.countryCard;

  return (
    <ResponsiveImage
      src={displaySrc}
      alt={alt}
      variant={variant}
      priority={priority}
      quality={quality}
      sizes={sizes}
      width={width ?? dims.width}
      height={height ?? dims.height}
      className={className}
      useErrorFallback={true}
    />
  );
}
