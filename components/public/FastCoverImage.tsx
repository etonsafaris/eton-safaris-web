'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { resolvePublicCmsImage } from '@/lib/public-image';
import { heroImageSrc } from '@/lib/responsive-image';

const IMAGE_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';

function realHeroSrc(src: string | null | undefined) {
  const saved = resolvePublicCmsImage(src);
  return saved ? heroImageSrc(saved, 85) : '';
}

/** Keep the last decoded hero. A new photo replaces it only after that file has loaded. */
export function useStableHeroSrc(src: string | null | undefined) {
  const next = realHeroSrc(src);
  const [shown, setShown] = useState(next);

  useEffect(() => {
    if (!next) {
      setShown('');
      return undefined;
    }
    if (next === shown) return undefined;
    if (!shown) {
      setShown(next);
      return undefined;
    }
    let cancelled = false;
    const img = new window.Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!cancelled) setShown(next);
    };
    img.src = next;
    return () => {
      cancelled = true;
    };
  }, [next, shown]);

  return shown;
}

/** Renders only the image saved for this page. Stock and Unsplash URLs are ignored. */
export function FastCoverImage({ src, alt = '' }: { src?: string | null; alt?: string }) {
  const shown = useStableHeroSrc(src);
  if (!shown) return null;

  const unoptimized =
    shown.startsWith('/api/media/') ||
    shown.startsWith('/cms-media/') ||
    shown.startsWith('/heroes/') ||
    shown.includes('images.unsplash.com');

  return (
    <Image
      src={shown}
      alt={alt || ''}
      fill
      priority={true}
      quality={85}
      sizes="100vw"
      unoptimized={unoptimized}
      placeholder="blur"
      blurDataURL={IMAGE_BLUR_DATA_URL}
      className="object-cover"
    />
  );
}
