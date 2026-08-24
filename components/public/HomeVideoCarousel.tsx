'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';

export default function HomeVideoCarousel({
  videos,
  poster,
  className = '',
}: {
  videos: string[];
  poster?: string;
  className?: string;
}) {
  const sources = (videos || []).map((item) => String(item || '').trim()).filter(Boolean);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const safeIndex = sources.length ? index % sources.length : 0;
  const current = sources[safeIndex] || '';
  const showControls = sources.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [sources.join('|')]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || !sources.length) return undefined;
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
  }, [sources.length]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !active || !current) return;
    node.muted = muted;
    const play = node.play();
    if (play && typeof play.catch === 'function') play.catch(() => undefined);
  }, [index, muted, active, current]);

  function goTo(next: number) {
    if (!showControls) return;
    setIndex((next + sources.length) % sources.length);
  }

  function handleEnded() {
    if (!showControls) {
      const node = videoRef.current;
      if (!node) return;
      node.currentTime = 0;
      const play = node.play();
      if (play && typeof play.catch === 'function') play.catch(() => undefined);
      return;
    }
    setIndex((currentIndex) => (currentIndex + 1) % sources.length);
  }

  return (
    <div ref={wrapRef} className={`relative aspect-[16/9] max-h-[340px] overflow-hidden rounded-2xl bg-black shadow-card ${className}`}>
      {active && current ? (
        <video
          key={`${safeIndex}-${current}`}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={current}
          poster={poster || undefined}
          autoPlay
          muted={muted}
          playsInline
          preload="metadata"
          onEnded={handleEnded}
        />
      ) : poster ? (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : null}
      {showControls ? (
        <>
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1)}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#111827] shadow-md hover:bg-white"
            aria-label="Previous video"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(safeIndex + 1)}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#111827] shadow-md hover:bg-white"
            aria-label="Next video"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}
      {current ? (
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/70"
          aria-label={muted ? 'Unmute video' : 'Mute video'}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
      ) : null}
      {showControls ? (
        <div className="absolute bottom-3 left-3 z-10 flex gap-1.5">
          {sources.map((src, itemIndex) => (
            <button
              key={`${src}-${itemIndex}`}
              type="button"
              onClick={() => goTo(itemIndex)}
              className={`h-2 w-2 rounded-full ${itemIndex === safeIndex ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Play video ${itemIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
