'use client';

import { useEffect, useState } from 'react';
import { FastCoverImage } from '@/components/public/FastCoverImage';
import { pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

const HERO_INTERVAL_MS = 7000;

export function PublicGallery({ photos }: { photos: RecordRow[] }) {
  const [heroIndex, setHeroIndex] = useState(0);
  const heroSrc = pickString(photos[heroIndex] ?? photos[0], ['image_url']);

  useEffect(() => {
    if (photos.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setHeroIndex((current) => {
        let next = current;
        while (next === current) next = Math.floor(Math.random() * photos.length);
        return next;
      });
    }, HERO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [photos.length]);

  return (
    <>
      <section className="relative h-[420px] overflow-hidden bg-[#e4efe6] md:h-[520px]">
        {heroSrc ? <FastCoverImage src={heroSrc} alt="" /> : null}
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/90">Safari moments from the road</p>
          <h1 className="mt-3 font-serif text-5xl font-bold md:text-6xl">Our Gallery</h1>
        </div>
      </section>
      <section className="public-gallery">
        {photos.length ? (
          <div className="public-gallery-grid">
            {photos.map((photo, index) => {
              const src = pickString(photo, ['image_url']);
              const title = pickString(photo, ['title', 'alt_text']);
              const caption = pickString(photo, ['caption']);
              const showCaption = caption && caption !== title;
              const photoId = photo.id != null ? `photo-${photo.id}` : `photo-${index}`;
              return (
                <figure id={photoId} key={photoId} className="public-gallery-item">
                  <img src={src} alt={title || caption || 'Safari photo'} loading="lazy" />
                  {title ? <p className="public-gallery-title">{title}</p> : null}
                  {showCaption ? <figcaption className="public-gallery-caption">{caption}</figcaption> : null}
                </figure>
              );
            })}
          </div>
        ) : (
          <p className="px-6 py-16 text-center text-gray-500">Photos added in the admin Gallery will appear here.</p>
        )}
      </section>
    </>
  );
}
