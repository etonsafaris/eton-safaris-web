'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import {
  CATEGORY_THUMB_HEIGHT,
  CATEGORY_THUMB_WIDTH,
  DEFAULT_CATEGORY_CARD_IMAGE,
  resolveCategoryDisplayImage,
} from '@/lib/category-display-image';
import type { RecordRow } from '@/lib/types';

type CategoryThumbnailProps = {
  category: RecordRow;
  alt: string;
  className?: string;
};

export default function CategoryThumbnail({ category, alt, className = '' }: CategoryThumbnailProps) {
  const initial = resolveCategoryDisplayImage(category);
  const [src, setSrc] = useState(initial);

  const onError = useCallback(() => {
    try {
      if (src !== DEFAULT_CATEGORY_CARD_IMAGE) {
        setSrc(DEFAULT_CATEGORY_CARD_IMAGE);
      }
    } catch {
      // never throw into error boundary
    }
  }, [src]);

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
      unoptimized={src.includes('images.unsplash.com')}
    />
  );
}
