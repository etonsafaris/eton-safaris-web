'use client';

import { resolvePublicImage } from '@/lib/public-image';
import {
  CARD_IMAGE_WIDTHS,
  HERO_IMAGE_WIDTHS,
  cardImageSrc,
  heroImageSrc,
  imageSrcSet,
} from '@/lib/responsive-image';

type ResponsiveImageProps = {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  variant?: 'hero' | 'card';
};

export default function ResponsiveImage({
  src,
  alt = '',
  className,
  sizes,
  priority = false,
  variant = 'card',
}: ResponsiveImageProps) {
  const resolved = resolvePublicImage(src);
  if (!resolved) return null;
  const displaySrc = variant === 'hero' ? heroImageSrc(resolved) : cardImageSrc(resolved);
  const srcSet = imageSrcSet(resolved, variant === 'hero' ? HERO_IMAGE_WIDTHS : CARD_IMAGE_WIDTHS);
  const avifSrcSet = /^\/heroes\//.test(resolved) ? srcSet.replace(/\.webp(?=\s|,|$)/g, '.avif') : '';
  const motionClass = variant === 'hero' ? 'hero-motion' : '';
  const defaultSizes =
    variant === 'hero' ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw';
  return (
    <picture className={variant === 'hero' || className?.includes('absolute') ? 'absolute inset-0 block h-full w-full' : 'block h-full w-full'}>
      {avifSrcSet ? <source type="image/avif" srcSet={avifSrcSet} sizes={sizes || defaultSizes} /> : null}
      <img
        src={displaySrc}
        srcSet={srcSet || undefined}
        sizes={sizes || defaultSizes}
        alt={alt}
        className={[className, motionClass].filter(Boolean).join(' ')}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'low'}
        decoding={priority ? 'sync' : 'async'}
        referrerPolicy="no-referrer"
        onError={(event) => {
          const image = event.currentTarget;
          if (image.dataset.fallback === '1') {
            image.style.visibility = 'hidden';
            return;
          }
          image.dataset.fallback = '1';
          image.srcset = '';
          image.removeAttribute('srcset');
          if (image.src !== resolved) image.src = resolved;
          else image.style.visibility = 'hidden';
        }}
      />
    </picture>
  );
}
