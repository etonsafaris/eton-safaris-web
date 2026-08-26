'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import RelatedSidebar, { type RelatedSidebarItem } from '@/components/public/RelatedSidebar';

/**
 * Renders only as many related items as fit beside the main article column,
 * so the sidebar never runs longer than the page content.
 */
export default function FitRelatedSidebar({
  title,
  items,
  countryName = '',
  articleSelector = '[data-content-article]',
}: {
  title: string;
  items: RelatedSidebarItem[];
  countryName?: string;
  articleSelector?: string;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleItems, setVisibleItems] = useState<RelatedSidebarItem[]>(items.slice(0, 3));

  useLayoutEffect(() => {
    function measure() {
      if (typeof window === 'undefined') return;
      // Mobile: stack layout — show a modest list
      if (window.matchMedia('(max-width: 1023px)').matches) {
        setVisibleItems(items.slice(0, 6));
        return;
      }

      const article = document.querySelector(articleSelector) as HTMLElement | null;
      const probe = measureRef.current;
      if (!article || !probe || items.length === 0) {
        setVisibleItems(items.slice(0, 4));
        return;
      }

      const articleHeight = article.getBoundingClientRect().height;
      const expertReserve = 280; // SpeakToExpertCard + gap below the list
      const available = Math.max(160, articleHeight - expertReserve);

      const titleEl = probe.querySelector('[data-fit-title]') as HTMLElement | null;
      const listPad = 40;
      const titleH = titleEl ? titleEl.getBoundingClientRect().height + 12 : 56;
      let used = titleH + listPad;
      let count = 0;

      const rows = probe.querySelectorAll('[data-fit-row]');
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i] as HTMLElement;
        const h = row.getBoundingClientRect().height || 72;
        if (used + h > available && count > 0) break;
        used += h;
        count += 1;
      }

      setVisibleItems(items.slice(0, Math.max(1, Math.min(count || 1, items.length))));
    }

    measure();
    const article = document.querySelector(articleSelector);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    if (article && ro) ro.observe(article);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [items, articleSelector]);

  return (
    <>
      {/* Off-screen probe measures natural item heights for the full candidate list */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute -z-10 w-[min(100%,280px)] opacity-0"
      >
        <div className="rounded-[20px] bg-[#edf2f2] p-2.5">
          <div data-fit-title className="p-2.5">
            <h2 className="mb-0 text-[28px] font-normal italic leading-[1.2] text-[#6aa441]">{title}</h2>
          </div>
          <ul className="list-none px-5">
            {items.map((item) => (
              <li key={`probe-${item.href}`} data-fit-row className="border-b border-[#d7e0e0] py-3">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-[72px] shrink-0 rounded bg-[#d7e0e0]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base leading-6">{item.title}</span>
                    {item.date && item.date !== '—' ? (
                      <span className="mt-1 block text-right font-serif text-sm italic">{item.date}</span>
                    ) : null}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <RelatedSidebar title={title} items={visibleItems} countryName={countryName} />
    </>
  );
}
