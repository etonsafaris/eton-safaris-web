'use client';

import { useEffect, useRef, useState } from 'react';

export default function DeferredVideo({
  src,
  fallbackSrc,
  poster,
  className,
}: {
  src: string;
  fallbackSrc?: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {active ? (
        <video
          className="absolute inset-0 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
        >
          <source src={src} type="video/mp4" />
          {fallbackSrc ? <source src={fallbackSrc} type="video/mp4" /> : null}
        </video>
      ) : poster ? (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : null}
    </div>
  );
}
