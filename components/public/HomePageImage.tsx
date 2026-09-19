'use client';

import ResponsiveImage from '@/components/public/ResponsiveImage';
import { resolvePublicImage } from '@/lib/public-image';

type HomePageImageProps = {
  src: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
  variant?: 'hero' | 'card';
  sizes?: string;
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
}: HomePageImageProps) {
  const resolved = resolvePublicImage(src);
  if (!resolved) return null;

  return (
    <ResponsiveImage
      src={resolved}
      alt={alt}
      variant={variant}
      priority={priority}
      quality={quality}
      sizes={sizes}
      className={className}
    />
  );
}
