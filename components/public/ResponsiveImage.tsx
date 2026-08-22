'use client';

import { resolvePublicImage } from '@/lib/public-image';
import { cardImageSrc, heroImageSrc, imageSrcSet } from '@/lib/responsive-image';

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
  const srcSet = imageSrcSet(resolved);
  const motionClass = variant === 'hero' ? 'hero-motion' : '';
  return (
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
        image.srcset = '';
        image.removeAttribute('srcset');
        image.style.visibility = 'hidden';
      }}
    />
  );
}
