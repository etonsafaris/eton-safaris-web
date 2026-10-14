'use client';

import { useEffect, useState } from 'react';
import { heroImageSrc } from '@/lib/responsive-image';

/** Same-origin photo so a hero frame is never a black box while the real image downloads. */
export const FAST_HERO_UNDERLAY = '/images/official-default-safari.jpg';

/** Keep the last decoded hero URL. A new src replaces it only after that file has loaded. */
export function useStableHeroSrc(src: string | null | undefined) {
  const next = String(src || '').trim() ? heroImageSrc(String(src).trim(), 58) : '';
  const [shown, setShown] = useState(next);

  useEffect(() => {
    if (!next || next === shown) return undefined;
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

export function FastCoverImage({ src, alt = '' }: { src?: string | null; alt?: string }) {
  const shown = useStableHeroSrc(src);
  const paint = shown || FAST_HERO_UNDERLAY;
  const preloadHref = String(src || '').trim() ? heroImageSrc(String(src).trim(), 58) : '';

  return (
    <>
      {preloadHref ? <link rel="preload" as="image" href={preloadHref} fetchPriority="high" /> : null}
      <img
        src={paint}
        alt={alt}
        width={1200}
        height={750}
        decoding="async"
        fetchPriority="high"
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </>
  );
}
