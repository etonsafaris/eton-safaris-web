'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { publicImagePlaceholderArt, publicImageSrcOrFallback, resolvePublicImage } from '@/lib/public-image';

type OptimizedPublicImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  fill?: boolean;
};

/** Next.js Image for public CMS media (no placeholder flash before real URL). */
export default function OptimizedPublicImage({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  priority = false,
  quality = 85,
  fill = false,
}: OptimizedPublicImageProps) {
  const resolved = useMemo(
    () => publicImageSrcOrFallback(resolvePublicImage(src) || src),
    [src]
  );
  const [failed, setFailed] = useState(false);
  const displaySrc = failed ? publicImagePlaceholderArt() : resolved;

  if (!displaySrc) return null;

  const shared = {
    src: displaySrc,
    alt: alt || '',
    className,
    priority,
    quality,
    sizes,
    onError: () => setFailed(true),
  };

  if (fill) {
    return <Image {...shared} fill />;
  }

  return <Image {...shared} width={width} height={height} />;
}
