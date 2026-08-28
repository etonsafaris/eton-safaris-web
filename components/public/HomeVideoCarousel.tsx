'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';

function uniqueVideos(videos: string[]) {
  const seen = new Set<string>();
  return (videos || [])
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

export default function HomeVideoCarousel({
  videos,
  poster,
  className = '',
}: {
  videos: string[];
  poster?: string;
  className?: string;
}) {
  const sourceKey = (videos || []).map((item) => String(item || '').trim()).filter(Boolean).join('|');
  const sources = useMemo(() => uniqueVideos(videos), [sourceKey]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(true);
  const safeIndex = sources.length ? index % sources.length : 0;
  const current = sources[safeIndex] || '';
  const hasPlaylist = sources.length > 1;

  useEffect(() => {
    setIndex((currentIndex) => {
      if (!sources.length) return 0;
      const url = sources[currentIndex % sources.length];
      const match = sources.indexOf(url);
      return match >= 0 ? match : 0;
    });
  }, [sourceKey]);

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
    node.loop = sources.length === 1;
    node.muted = muted;
    const play = node.play();
    if (play && typeof play.catch === 'function') play.catch(() => undefined);
  }, [index, muted, active, current]);

  function goTo(next: number) {
    if (!sources.length) return;
    setIndex((next + sources.length) % sources.length);
  }

  function handleEnded() {
    if (sources.length > 1) {
      setIndex((currentIndex) => (currentIndex + 1) % sources.length);
      return;
    }
    const node = videoRef.current;
    if (node) node.pause();
  }

  return (
    <div
      ref={wrapRef}
      className={`relative mx-auto aspect-video w-full min-w-0 overflow-hidden rounded-xl bg-black shadow-card ${className}`}
    >
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
          loop={sources.length === 1}
          onEnded={handleEnded}
        />
      ) : poster ? (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : null}
      {hasPlaylist ? (
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
      {hasPlaylist ? (
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
