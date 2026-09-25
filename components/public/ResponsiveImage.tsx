'use client';

import { SITE_LOGO } from '@/lib/collections';
import { resolvePublicImage } from '@/lib/public-image';
import { cardImageSrc, heroImageSrc, imageSrcSet } from '@/lib/responsive-image';

type ResponsiveImageProps = {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  variant?: 'hero' | 'card';
};

const ULTIMATE_FALLBACK = SITE_LOGO;

export default function ResponsiveImage({
  src,
  alt = '',
  className,
  sizes,
  priority = false,
  quality,
  variant = 'card',
}: ResponsiveImageProps) {
  const resolved = resolvePublicImage(src);
  if (!resolved) return null;
  const heroQuality = quality ?? 85;
  const displaySrc =
    variant === 'hero' ? heroImageSrc(resolved, heroQuality) : cardImageSrc(resolved);
  const srcSet = imageSrcSet(resolved);
  const motionClass = variant === 'hero' ? 'hero-motion' : '';
  return (
    <picture>
      <img
        src={displaySrc}
        srcSet={srcSet || undefined}
        sizes={sizes || (variant === 'hero' ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw')}
        alt={alt}
        className={[className, motionClass].filter(Boolean).join(' ')}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'low'}
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
          if (variant === 'hero' && !image.dataset.fallbackUltimate && image.src !== ULTIMATE_FALLBACK) {
            image.dataset.fallbackUltimate = '1';
            image.removeAttribute('srcset');
            image.src = ULTIMATE_FALLBACK;
            image.style.visibility = '';
            return;
          }
          image.style.visibility = 'hidden';
        }}
      />
    </picture>
  );
}
