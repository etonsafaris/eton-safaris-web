'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ItemsPerView = { sm?: number; md?: number; lg?: number };

type CarouselProps = {
  items: React.ReactNode[];
  autoPlayMs?: number;
  itemsPerView?: ItemsPerView;
  className?: string;
  emptyMessage?: string;
  instant?: boolean;
  pauseOnHover?: boolean;
  paused?: boolean;
};

function useItemsPerView(config: ItemsPerView) {
  const { sm = 1, md = 2, lg = 3 } = config;
  const [perView, setPerView] = useState(lg);

  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) setPerView(sm);
      else if (window.innerWidth < 1024) setPerView(md);
      else setPerView(lg);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sm, md, lg]);

  return perView;
}

export default function Carousel({
  items,
  autoPlayMs = 6000,
  itemsPerView = { sm: 1, md: 2, lg: 3 },
  className = '',
  emptyMessage = 'No records found in this collection.',
  instant = false,
  pauseOnHover = true,
  paused = false,
}: CarouselProps) {
  const perView = useItemsPerView(itemsPerView);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);

  const maxIndex = Math.max(0, items.length - perView);
  const autoplayActive = !paused && !(pauseOnHover && hovering);

  useEffect(() => {
    setIndex((value) => Math.min(value, maxIndex));
  }, [maxIndex]);

  const goNext = useCallback(() => {
    setIndex((value) => (value >= maxIndex ? 0 : value + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((value) => (value <= 0 ? maxIndex : value - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (items.length <= perView || autoPlayMs <= 0 || !autoplayActive) return undefined;
    const timer = setInterval(goNext, autoPlayMs);
    return () => clearInterval(timer);
  }, [autoPlayMs, autoplayActive, goNext, items.length, perView]);

  const slideWidth = useMemo(() => `${100 / perView}%`, [perView]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {items.length > perView && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute -left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white p-3 shadow-md hover:bg-gray-50 sm:-left-4"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute -right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white p-3 shadow-md hover:bg-gray-50 sm:-right-4"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="overflow-hidden px-1">
        <div
          className={`flex ease-out ${instant ? '' : 'transition-transform duration-500'}`}
          style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
        >
          {items.map((item, itemIndex) => (
            <div key={itemIndex} className="flex shrink-0 px-2" style={{ width: slideWidth }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
