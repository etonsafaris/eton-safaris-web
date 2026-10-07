'use client';

import ResponsiveImage from '@/components/public/ResponsiveImage';
import { COUNTRY_IMAGE_DIMENSIONS } from '@/lib/official-country-assets';
import { resolvePublicCmsImage, resolvePublicHeroCarouselImage } from '@/lib/public-image';

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
  /** Home destination grid: show verified stock when CMS cover is missing. */
  allowCarouselFallback?: boolean;
};

/** Home sections: admin CMS media only. */
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
  allowCarouselFallback = false,
}: HomePageImageProps) {
  const resolve =
    variant === 'hero' || allowCarouselFallback ? resolvePublicHeroCarouselImage : resolvePublicCmsImage;
  const displaySrc = resolve(src);
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
      quality={quality ?? 85}
      sizes={sizes}
      width={width ?? dims.width}
      height={height ?? dims.height}
      className={className}
      useErrorFallback={true}
    />
  );
}
