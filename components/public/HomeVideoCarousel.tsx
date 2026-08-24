'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { SITE_MEDIA } from '@/lib/site-media';

const CLIP_MS = 5000;

export default function HomeVideoCarousel({
  videos,
  poster = SITE_MEDIA.gorillasForest,
  className = '',
}: {
  videos: string[];
  poster?: string;
  className?: string;
}) {
  const list = (videos || []).map((item) => String(item || '').trim()).filter(Boolean);
  const sources = list.length ? list : [SITE_MEDIA.gorillaVideo];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
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

  useEffect(() => {
    if (!active || sources.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % sources.length);
    }, CLIP_MS);
    return () => window.clearInterval(timer);
  }, [active, sources.length]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !active) return;
    node.muted = muted;
    const play = node.play();
    if (play && typeof play.catch === 'function') play.catch(() => undefined);
  }, [index, muted, active, sources]);

  const current = sources[index] || sources[0];

  return (
    <div ref={wrapRef} className={`relative aspect-[16/9] max-h-[340px] overflow-hidden rounded-2xl bg-black shadow-card ${className}`}>
      {active ? (
        <video
          key={current}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={current}
          poster={poster}
          autoPlay
          muted={muted}
          playsInline
          preload="metadata"
        />
      ) : (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      )}
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/70"
        aria-label={muted ? 'Unmute video' : 'Mute video'}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {muted ? 'Unmute' : 'Mute'}
      </button>
      {sources.length > 1 ? (
        <div className="absolute bottom-3 left-3 z-10 flex gap-1.5">
          {sources.map((src, itemIndex) => (
            <button
              key={`${src}-${itemIndex}`}
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`h-2 w-2 rounded-full ${itemIndex === index ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Play video ${itemIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
