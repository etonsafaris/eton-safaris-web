'use client';

import { DEFAULT_COUNTRY_HERO } from '@/lib/country-heroes';
import { resolvePublicImage } from '@/lib/public-image';
import { COUNTRY_IMAGE_DIMENSIONS, OFFICIAL_COMMUNITY_HERO_PATHS } from '@/lib/official-country-assets';
import { cardImageSrc, countryDestinationCardSrc, heroImageSrc, imageSrcSet } from '@/lib/responsive-image';
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
}: ResponsiveImageProps) {
  const resolved = resolvePublicImage(src);
  if (!resolved) return null;
  const heroQuality = quality ?? 85;
  const isHomeDestination =
    variant === 'card' && width === COUNTRY_IMAGE_DIMENSIONS.homeDestination.width;
  const displaySrc =
    variant === 'hero'
      ? heroImageSrc(resolved, heroQuality)
      : isHomeDestination
        ? countryDestinationCardSrc(resolved)
        : cardImageSrc(resolved);
  const dims =
    variant === 'hero'
      ? COUNTRY_IMAGE_DIMENSIONS.countryHero
      : isHomeDestination
        ? COUNTRY_IMAGE_DIMENSIONS.homeDestination
        : COUNTRY_IMAGE_DIMENSIONS.countryCard;
  const imgWidth = width ?? dims.width;
  const imgHeight = height ?? dims.height;
  const srcSet = imageSrcSet(resolved);
  const motionClass = variant === 'hero' ? 'hero-motion' : '';
  return (
    <picture>
      <img
        src={displaySrc}
        srcSet={srcSet || undefined}
        sizes={sizes || (variant === 'hero' ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw')}
        width={imgWidth}
        height={imgHeight}
        alt={alt}
        className={[className, motionClass].filter(Boolean).join(' ')}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        referrerPolicy="no-referrer"
        onError={(event) => {
          const image = event.currentTarget;
          const original = resolvePublicImage(src) || '';
          if (!image.dataset.fallback && original && image.src !== original) {
            image.dataset.fallback = '1';
            image.removeAttribute('srcset');
            image.src = original;
            image.style.visibility = '';
            return;
          }
          const fallback = variant === 'hero' ? HERO_FALLBACK : CARD_FALLBACK;
          if (!image.dataset.fallbackUltimate && fallback && image.src !== fallback) {
            image.dataset.fallbackUltimate = '1';
            image.removeAttribute('srcset');
            image.src = fallback;
            image.style.visibility = '';
            return;
          }
          image.style.visibility = 'hidden';
        }}
      />
    </picture>
  );
}
