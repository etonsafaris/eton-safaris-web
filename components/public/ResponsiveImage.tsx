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
  const displaySrc = variant === 'hero' ? heroImageSrc(src) : cardImageSrc(src);
  const srcSet = imageSrcSet(src);
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
    />
  );
}
