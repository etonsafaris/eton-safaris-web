'use client';

import { useEffect, useState } from 'react';
import { resolvePublicCmsImage } from '@/lib/public-image';
import { heroImageSrc } from '@/lib/responsive-image';

function realHeroSrc(src: string | null | undefined) {
  const saved = resolvePublicCmsImage(src);
  return saved ? heroImageSrc(saved, 58) : '';
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

  return (
    <>
      <link rel="preload" as="image" href={shown} fetchPriority="high" />
      <img
        src={shown}
        alt={alt}
        width={1200}
        height={750}
        decoding="sync"
        fetchPriority="high"
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </>
  );
}
