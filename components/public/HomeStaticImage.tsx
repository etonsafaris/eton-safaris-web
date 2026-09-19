'use client';

import Image from 'next/image';
import { resolvePublicImage } from '@/lib/public-image';

/** Tiny neutral blur — avoids hero/card layout flash while local assets decode. */
const LOCAL_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

type HomeStaticImageProps = {
  src: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
};

/** Next.js-optimized local `/heroes/*` and static public assets (fixed box, no CLS). */
export default function HomeStaticImage({
  src,
  alt = '',
  className,
  priority = false,
  sizes = '100vw',
  quality,
}: HomeStaticImageProps) {
  const resolved = resolvePublicImage(src);
  if (!resolved || !resolved.startsWith('/')) return null;

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      blurDataURL={LOCAL_BLUR_DATA_URL}
      quality={quality ?? (priority ? 90 : 75)}
      className={className}
    />
  );
}
