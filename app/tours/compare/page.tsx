'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicShell from '@/components/public/PublicShell';
import PageHero from '@/components/public/PageHero';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, isPublishedRecord, pickNumber, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export default function TourComparePage() {
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [destination, setDestination] = useState('All');

  useEffect(() => {
    fetchCollectionRecords('tours')
      .then(setTours)
      .catch((error) => console.error(error));
  }, []);

  const countries = useMemo(() => {
    const unique = new Set(tours.map((tour) => pickString(tour, ['country'])).filter(Boolean));
    return ['All', ...Array.from(unique)];
  }, [tours]);

  const rows = useMemo(
    () =>
      tours.filter(
        (tour) =>
          isPublishedRecord(tour) &&
          (destination === 'All' || pickString(tour, ['country']) === destination)
      ),
    [destination, tours]
  );

  return (
    <PublicShell>
      <PageHero
        title="Compare Safari Packages"
        subtitle="Compare duration and included activities across destinations."
        image={rows[0] ? getRecordImage(rows[0]) : undefined}
      />
      <section className="mx-auto max-w-7xl px-4 py-8">
          <label className="block max-w-xs text-sm font-medium text-gray-700">
            Destination
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            >
              {countries.map((country) => (
                <option key={country}>{country}</option>
              ))}
            </select>
          </label>
      </section>

      <section className="mx-auto max-w-7xl overflow-x-auto px-4 py-12">
        {rows.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <table className="min-w-full overflow-hidden rounded-2xl border border-gray-100 bg-white text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Category / activities</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((tour, index) => (
                <tr key={String(tour.id ?? index)} className="border-t border-gray-100">
                  <td className="px-4 py-4 font-serif text-base text-forest">{getRecordTitle(tour)}</td>
                  <td className="px-4 py-4">{pickString(tour, ['country']) || '—'}</td>
                  <td className="px-4 py-4">
                    {pickNumber(tour, ['duration_days']) > 0 ? `${pickNumber(tour, ['duration_days'])} days` : '—'}
                  </td>
                  <td className="max-w-xs px-4 py-4 text-gray-600">
                    {pickString(tour, ['category', 'highlights']) || '—'}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/tours/${pickString(tour, ['slug']) || tour.id}`}
                      className="font-semibold text-moss"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PublicShell>
  );
}
