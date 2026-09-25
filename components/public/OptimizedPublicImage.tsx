'use client';

import Image from 'next/image';
import { IMAGE_BLUR_DATA_URL } from '@/lib/static-build';
import { resolvePublicImage } from '@/lib/public-image';

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
  const resolved = resolvePublicImage(src);
  if (!resolved) return null;

  const shared = {
    src: resolved,
    alt,
    className,
    priority,
    quality,
    sizes,
    placeholder: 'blur' as const,
    blurDataURL: IMAGE_BLUR_DATA_URL,
  };

  if (fill) {
    return <Image {...shared} fill />;
  }

  return <Image {...shared} width={width} height={height} />;
}
