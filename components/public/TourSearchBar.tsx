'use client';



import { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { Search } from 'lucide-react';

import { languagePostSearchCard, searchLanguagePosts } from '@/lib/content-search';

import { fetchCollectionRecords } from '@/lib/data';

import { suggestTours, tourSearchCard } from '@/lib/tour-search';

import type { RecordRow } from '@/lib/types';

import { getRecordTitle } from '@/lib/data';



type TourSearchBarProps = {

  tours: RecordRow[];

  categories: RecordRow[];

  destinations: string[];

  initialQuery?: string;

  initialDestination?: string;

  initialCategory?: string;

  className?: string;

};



export default function TourSearchBar({

  tours,

  categories,

  destinations,

  initialQuery = '',

  initialDestination = 'All destinations',

  initialCategory = '',

  className = '',

}: TourSearchBarProps) {

  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);

  const [destination, setDestination] = useState(initialDestination);

  const [category, setCategory] = useState(initialCategory);

  const [languagePosts, setLanguagePosts] = useState<RecordRow[]>([]);

  const [open, setOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);



  useEffect(() => {

    setQuery(initialQuery);

    setDestination(initialDestination || 'All destinations');

    setCategory(initialCategory);

  }, [initialQuery, initialDestination, initialCategory]);



  useEffect(() => {

    fetchCollectionRecords('safari_updates')

      .then(setLanguagePosts)

      .catch((error) => console.error('[Search] Failed to load language posts:', error));

  }, []);



  const suggestions = useMemo(() => suggestTours(tours, query), [tours, query]);

  const guides = useMemo(() => searchLanguagePosts(languagePosts, query), [languagePosts, query]);

  const hasDropdownResults = suggestions.length > 0 || guides.length > 0;



  useEffect(() => {

    function close(event: MouseEvent) {

      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);

    }

    document.addEventListener('mousedown', close);

    return () => document.removeEventListener('mousedown', close);

  }, []);



  function searchHref() {

    const params = new URLSearchParams();

    if (query.trim()) params.set('q', query.trim());

    if (destination && destination !== 'All destinations') params.set('destination', destination);

    if (category) params.set('category', category);

    const qs = params.toString();

    return qs ? `/tours?${qs}` : '/tours';

  }



  function submit(event: React.FormEvent) {

    event.preventDefault();

    setOpen(false);

    router.push(searchHref());

  }



  const fieldClass =

    'w-full border border-gray-200 bg-[#f9f9f9] px-4 py-2.5 text-sm text-[#333] outline-none focus:border-moss';



  return (

    <div className={`relative z-20 ${className}`}>

      <div className="mx-auto max-w-[1100px] bg-white px-5 py-5 shadow-xl md:px-8 md:py-6">

        <form onSubmit={submit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-4 md:gap-4">

          <div className="relative" ref={boxRef}>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-moss">

              Search by Name

            </label>

            <div className="relative">

              <input

                name="q"

                value={query}

                onChange={(event) => {

                  setQuery(event.target.value);

                  setOpen(true);

                }}

                onFocus={() => setOpen(true)}

                placeholder="Tour name..."

                autoComplete="off"

                className={`${fieldClass} pr-9`}

              />

              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            </div>

            {open && query.trim().length >= 2 && (

              <div className="absolute z-30 mt-1 w-full overflow-hidden border bg-white shadow-lg md:w-[28rem]">

                {!hasDropdownResults ? (

                  <p className="px-4 py-3 text-sm font-normal normal-case text-gray-500">

                    No tour package found. Try another search.

                  </p>

                ) : (

                  <>

                    {suggestions.map((tour, index) => {

                      const card = tourSearchCard(tour);

                      return (

                        <Link

                          key={String(tour.id ?? index)}

                          href={card.href}

                          onClick={() => setOpen(false)}

                          className="flex gap-3 border-b px-3 py-2 hover:bg-[#f9f9f9]"

                        >

                          {card.image ? (

                            <img src={card.image} alt="" className="h-14 w-16 shrink-0 object-cover" />

                          ) : (

                            <div className="h-14 w-16 shrink-0 bg-gray-100" />

                          )}

                          <span className="min-w-0 text-left font-normal normal-case">

                            <span className="block truncate text-sm font-semibold text-[#333]">{card.title}</span>

                            <span className="block text-[11px] text-moss">

                              {[card.destination, card.duration].filter(Boolean).join(' · ')}

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

                          className="flex gap-3 border-b px-3 py-2 last:border-0 hover:bg-[#f9f9f9]"

                        >

                          <div className="flex h-14 w-16 shrink-0 items-center justify-center bg-moss/10 text-[10px] font-bold uppercase tracking-wide text-moss">

                            Guide

                          </div>

                          <span className="min-w-0 text-left font-normal normal-case">

                            <span className="block truncate text-sm font-semibold text-[#333]">{card.title}</span>

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

                  className="block w-full bg-[#f9f9f9] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-moss hover:bg-sage/20"

                >

                  View all results

                </button>

              </div>

            )}

          </div>

          <div>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-moss">

              Destination

            </label>

            <select

              value={destination}

              onChange={(event) => setDestination(event.target.value)}

              className={`${fieldClass} cursor-pointer appearance-none`}

            >

              <option>All destinations</option>

              {destinations.map((item) => (

                <option key={item}>{item}</option>

              ))}

            </select>

          </div>

          <div>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-moss">

              Activity Type

            </label>

            <select

              value={category}

              onChange={(event) => setCategory(event.target.value)}

              className={`${fieldClass} cursor-pointer appearance-none`}

            >

              <option value="">All activities</option>

              {categories.map((item, index) => (

                <option key={String(item.id ?? index)} value={getRecordTitle(item)}>

                  {getRecordTitle(item)}

                </option>

              ))}

            </select>

          </div>

          <button

            type="submit"

            className="flex items-center justify-center gap-2 bg-moss px-6 py-2.5 text-sm font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a]"

          >

            <Search className="h-4 w-4" /> Search Tours

          </button>

        </form>

      </div>

    </div>

  );

}


