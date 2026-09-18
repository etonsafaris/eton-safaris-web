'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { DiscoverySearchCard } from '@/lib/discovery-search';

type DiscoveryPayload = {
  parks: DiscoverySearchCard[];
  stays: DiscoverySearchCard[];
  places: DiscoverySearchCard[];
};

export default function DiscoverySearchSection({ query }: { query: string }) {
  const [data, setData] = useState<DiscoveryPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/public/search?q=${encodeURIComponent(q)}`, { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((body: DiscoveryPayload) => {
        if (!cancelled) setData(body);
      })
      .catch(() => {
        if (!cancelled) setData({ parks: [], stays: [], places: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const items = [...(data?.parks || []), ...(data?.stays || []), ...(data?.places || [])];
  if (!query.trim() || query.trim().length < 2) return null;
  if (!loading && items.length === 0) return null;

  return (
    <ListingBlock loading={loading} items={items} />
  );
}

function ListingBlock({ loading, items }: { loading: boolean; items: DiscoverySearchCard[] }) {
  return (
    <section className="border-t border-gray-200 bg-white px-4 py-10">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="font-serif text-2xl font-medium text-[#343434]">Parks, lodges &amp; places</h2>
        <p className="mt-1 text-sm text-gray-600">Matching your search — not shown on our main menu until you look for them.</p>
        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Searching…</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={`${item.kind}-${item.href}`}>
                <Link
                  href={item.href}
                  className="flex gap-3 rounded-lg border border-gray-100 bg-[#fafafa] p-3 transition hover:border-moss/40 hover:shadow-sm"
                >
                  {item.image ? (
                    <img src={item.image} alt="" width={72} height={64} className="h-16 w-[4.5rem] shrink-0 object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-16 w-[4.5rem] shrink-0 items-center justify-center bg-moss/10 text-[10px] font-bold uppercase text-moss">
                      {item.kindLabel.slice(0, 4)}
                    </div>
                  )}
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-moss">{item.kindLabel}</span>
                    <span className="block truncate font-semibold text-[#333]">{item.title}</span>
                    {item.meta ? <span className="block truncate text-xs text-gray-500">{item.meta}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
