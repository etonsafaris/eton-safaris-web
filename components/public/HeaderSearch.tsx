'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { pickString, searchTours } from '@/lib/data';
import { suggestTours, tourSearchCard } from '@/lib/tour-search';
import type { RecordRow } from '@/lib/types';

export default function HeaderSearch() {
  const router = useRouter();
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setTours([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void searchTours({ query: needle, limit: 8 })
        .then(setTours)
        .catch((error) => console.error('[Search] Failed to load tours:', error));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const suggestions = useMemo(() => suggestTours(tours, query), [tours, query]);
  const hasResults = suggestions.length > 0;

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setOpen(false);
    const q = query.trim();
    router.push(q ? `/tours?q=${encodeURIComponent(q)}` : '/tours');
  }

  return (
    <div className="relative w-full max-w-xs" ref={boxRef}>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="header-tour-search">
          Search safari packages by name, destination, or activity
        </label>
        <div className="flex items-center rounded-full border border-gray-200 bg-cream px-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            id="header-tour-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search safari packages…"
            autoComplete="off"
            className="w-full bg-transparent px-2 py-2 text-sm outline-none"
          />
        </div>
        {open && query.trim().length >= 2 && (
          <div className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border bg-white shadow-lg">
            {!hasResults ? (
              <p className="px-4 py-3 text-sm text-gray-500">No matching tours. Try another search.</p>
            ) : (
              <>
                {(suggestions ?? [])?.map((tour, index) => {
                  const card = tourSearchCard(tour);
                  return (
                    <Link
                      key={String(tour.id ?? index)}
                      href={card.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 border-b px-3 py-2 hover:bg-cream"
                    >
                      <img
                        src={card.image}
                        alt=""
                        width={56}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-14 shrink-0 rounded-md object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-forest">{card.title}</span>
                        <span className="block text-[11px] text-moss">
                          {[card.destination, pickString(tour, ['category']), card.duration].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </>
            )}
            <button
              type="submit"
              className="block w-full bg-cream px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-moss hover:bg-sage/30"
            >
              View all tour results
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
