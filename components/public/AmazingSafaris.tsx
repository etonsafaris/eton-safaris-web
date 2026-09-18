'use client';

import TourCard from '@/components/public/TourCard';
import type { RecordRow } from '@/lib/types';

export default function AmazingSafaris({
  tours,
  title = 'Explore Our Amazing Safaris',
  kicker,
  emptyMessage,
  columns = 4,
}: {
  tours: RecordRow[];
  title?: string;
  kicker?: string;
  emptyMessage?: string;
  columns?: 3 | 4;
}) {
  const safeTours = (tours ?? []).filter((row): row is RecordRow => Boolean(row));
  if (!safeTours.length && !emptyMessage) return null;

  return (
    <section className="w-full bg-transparent px-5 py-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="dav-amazing-title">
          {kicker ? <div className="dav-amazing-kicker">{kicker}</div> : null}
          <h3>{title}</h3>
          {safeTours.length > 0 ? (
            <p className="mt-2 text-sm font-medium text-[#4b5563]">
              {safeTours.length.toLocaleString()} package{safeTours.length === 1 ? '' : 's'}
            </p>
          ) : null}
          <span className="dav-amazing-underline" />
        </div>
        {safeTours.length === 0 ? (
          <p className="py-8 text-center text-gray-500">{emptyMessage}</p>
        ) : (
          <div className={`grid gap-6 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
            {safeTours.map((tour, index) => (
              <TourCard key={String(tour?.id ?? index)} tour={tour} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
