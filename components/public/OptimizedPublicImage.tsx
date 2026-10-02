'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { IMAGE_BLUR_DATA_URL } from '@/lib/static-build';
import {
  DEFAULT_PUBLIC_IMAGE,
  DEFAULT_SAFARI_FALLBACK_IMAGE,
  publicImageSrcOrFallback,
  resolvePublicImage,
} from '@/lib/public-image';

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

/** Next.js Image for public CMS + bundled heroes (WebP/AVIF via optimizer). */
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
  const initial = publicImageSrcOrFallback(resolvePublicImage(src) || src);
  const [displaySrc, setDisplaySrc] = useState(initial);

  useEffect(() => {
    setDisplaySrc(publicImageSrcOrFallback(resolvePublicImage(src) || src));
  }, [src]);

  if (!displaySrc) return null;

  const shared = {
    src: displaySrc,
    alt: alt || '',
    className,
    priority,
    quality,
    sizes,
    placeholder: 'blur' as const,
    blurDataURL: IMAGE_BLUR_DATA_URL,
    onError: () => {
      if (displaySrc === DEFAULT_SAFARI_FALLBACK_IMAGE) {
        setDisplaySrc(DEFAULT_PUBLIC_IMAGE);
        return;
      }
      if (displaySrc === DEFAULT_PUBLIC_IMAGE) {
        setDisplaySrc('');
        return;
      }
      setDisplaySrc(DEFAULT_SAFARI_FALLBACK_IMAGE);
    },
  };

  if (fill) {
    return <Image {...shared} fill />;
  }

  return <Image {...shared} width={width} height={height} />;
}
