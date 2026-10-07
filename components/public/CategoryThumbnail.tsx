'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
  CATEGORY_THUMB_HEIGHT,
  CATEGORY_THUMB_WIDTH,
  DEFAULT_CATEGORY_CARD_IMAGE,
  resolveCategoryDisplayImage,
} from '@/lib/category-display-image';
import type { RecordRow } from '@/lib/types';

type CategoryThumbnailProps = {
  category?: RecordRow;
  alt: string;
  className?: string;
  srcOverride?: string;
};

export default function CategoryThumbnail({ category, alt, className = '', srcOverride }: CategoryThumbnailProps) {
  const initial = srcOverride?.trim() || (category ? resolveCategoryDisplayImage(category) : '');
  const [src, setSrc] = useState(initial);

  useEffect(() => {
    setSrc(initial);
  }, [initial]);

  const onError = useCallback(() => {
    try {
      if (src !== DEFAULT_CATEGORY_CARD_IMAGE) {
        setSrc(DEFAULT_CATEGORY_CARD_IMAGE);
      }
    } catch {
      // never throw into error boundary
    }
  }, [src]);

  if (!src) {
    return <div className={`h-full w-full bg-gray-100 ${className}`.trim()} aria-hidden />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={CATEGORY_THUMB_WIDTH}
      height={CATEGORY_THUMB_HEIGHT}
      sizes="(max-width: 640px) 45vw, 200px"
      loading="lazy"
      className={`h-full w-full object-cover ${className}`.trim()}
      onError={onError}
      unoptimized={src.includes('images.unsplash.com') || src.startsWith('/api/media/')}
    />
  );
}
