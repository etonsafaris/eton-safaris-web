'use client';

import { DEFAULT_PUBLIC_IMAGE, resolvePublicImage } from '@/lib/public-image';
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
  const displaySrc = variant === 'hero' ? heroImageSrc(resolved) : cardImageSrc(resolved);
  const srcSet = imageSrcSet(resolved);
  return (
    <img
      src={displaySrc}
      srcSet={srcSet || undefined}
      sizes={sizes || (variant === 'hero' ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw')}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'low'}
      decoding={priority ? 'sync' : 'async'}
      referrerPolicy="no-referrer"
      onError={(event) => {
        const image = event.currentTarget;
        const fallback = DEFAULT_PUBLIC_IMAGE;
        if (!image.src.includes('/heroes/') && image.src !== fallback) {
          image.srcset = '';
          image.src = fallback;
        }
      }}
    />
  );
}
