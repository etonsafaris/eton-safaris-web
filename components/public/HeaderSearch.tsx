'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { languagePostSearchCard, searchLanguagePosts } from '@/lib/content-search';
import { fetchCollectionPage, pickString, searchTours } from '@/lib/data';
import { suggestTours, tourSearchCard } from '@/lib/tour-search';
import type { RecordRow } from '@/lib/types';

export default function HeaderSearch() {
  const router = useRouter();
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [languagePosts, setLanguagePosts] = useState<RecordRow[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setTours([]);
      setLanguagePosts([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void searchTours({ query: needle, limit: 8 })
        .then(setTours)
        .catch((error) => console.error('[Search] Failed to load tours:', error));
      void fetchCollectionPage('safari_updates', [], { limit: 8, offset: 0 })
        .then(({ rows }) => setLanguagePosts(searchLanguagePosts(rows, needle).slice(0, 4)))
        .catch((error) => console.error('[Search] Failed to load guides:', error));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const suggestions = useMemo(() => suggestTours(tours, query), [tours, query]);
  const guides = languagePosts;
  const hasResults = suggestions.length > 0 || guides.length > 0;

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
            placeholder="Search tours, parks, activities…"
            autoComplete="off"
            className="w-full bg-transparent px-2 py-2 text-sm outline-none"
          />
        </div>
        {open && query.trim().length >= 2 && (
          <div className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border bg-white shadow-lg">
            {!hasResults ? (
              <p className="px-4 py-3 text-sm text-gray-500">No matching tours or guides. Try another search.</p>
            ) : (
              <>
                {suggestions.map((tour, index) => {
                  const card = tourSearchCard(tour);
                  return (
                    <Link
                      key={String(tour.id ?? index)}
                      href={card.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 border-b px-3 py-2 hover:bg-cream"
                    >
                      {card.image ? (
                        <img src={card.image} alt="" width={56} height={48} loading="lazy" decoding="async" className="h-12 w-14 shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="h-12 w-14 shrink-0 rounded-md bg-gray-100" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-forest">{card.title}</span>
                        <span className="block text-[11px] text-moss">
                          {[card.destination, pickString(tour, ['category']), card.duration].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </Link>
                  );
                })}
                {guides.map((post, index) => {
                  const card = languagePostSearchCard(post);
                  return (
                    <Link
                      key={`guide-${String(post.id ?? index)}`}
                      href={card.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 border-b px-3 py-2 last:border-0 hover:bg-cream"
                    >
                      <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-md bg-moss/10 text-[10px] font-bold uppercase tracking-wide text-moss">
                        Guide
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-forest">{card.title}</span>
                        {card.excerpt ? (
                          <span className="block truncate text-[11px] text-gray-500">{card.excerpt}</span>
                        ) : null}
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
