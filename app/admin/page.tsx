'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminCountsProvider, useAdminCounts } from '@/components/admin/AdminCountsProvider';
import { MAIN_COLLECTIONS, SYSTEM_COLLECTIONS } from '@/lib/collections';
import { collectionIcon } from '@/lib/admin-icons';
import { useAdminSession } from '@/components/admin/useAdminSession';
import BookingPerformanceChart from '@/components/admin/BookingPerformanceChart';
import AdminLogoLoader from '@/components/admin/AdminLogoLoader';
import { fetchAdminTable } from '@/lib/admin-records-client';
import { getRecordTitle, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function AdminOverviewPage() {
  const { user } = useAdminSession();
  const { counts, loading: countsLoading } = useAdminCounts();
  const [bookings, setBookings] = useState<RecordRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchAdminTable('bookings')
      .then((bookingRows) => {
        if (mounted) setBookings(bookingRows);
      })
      .catch((error) => {
        console.error(error);
        if (mounted) setBookings([]);
      })
      .finally(() => {
        if (mounted) setBookingsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const loading = countsLoading && bookingsLoading;

  const destinations: Record<string, number> = {};
  bookings.forEach((booking) => {
    const dest = pickString(booking, ['destination', 'country', 'tour']) || 'Other';
    destinations[dest] = (destinations[dest] || 0) + 1;
  });
  const topDestinations = Object.entries(destinations).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxDest = topDestinations[0]?.[1] || 1;

  const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'Admin';
  const overviewModules = [
    ...MAIN_COLLECTIONS.filter((item) => item.id !== 'overview'),
    ...SYSTEM_COLLECTIONS,
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <AdminLogoLoader label="Loading dashboard" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-[#00A651]">Dashboard</p>
      <h2 className="mt-1 font-serif text-3xl font-bold text-[#111827] dark:text-white">
        Welcome back, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
      </h2>
      <p className="mt-1 text-sm text-[#6b7280] dark:text-gray-400">
        Live counts from every connected collection.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewModules.map((item) => {
          const Icon = collectionIcon(item.icon);
          const href = `/admin/${item.id}`;
          const total = item.table ? counts[item.id] ?? 0 : null;
          return (
            <Link
              key={item.id}
              href={href}
              className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#161b22]"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-[#6b7280] dark:text-gray-400">{item.label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ecfdf3] text-[#00A651]">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-[#111827] dark:text-white">
                {total != null ? total.toLocaleString() : 'Open'}
              </p>
              {total != null ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                  {total === 1 ? 'item' : 'items'}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold dark:text-white">Recent Bookings</h3>
            <Link href="/admin/bookings" className="text-sm font-medium text-[#00A651]">
              View All
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No records found in this collection.</p>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 5).map((booking, index) => (
                <div key={String(booking.id ?? index)} className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-3 dark:bg-white/5">
                  <div>
                    <p className="font-medium dark:text-white">{getRecordTitle(booking)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{pickString(booking, ['tour', 'destination'])}</p>
                  </div>
                  <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-semibold text-[#00A651]">
                    {pickString(booking, ['payment_status', 'status']) || 'Pending Booking'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
          <h3 className="mb-4 font-semibold dark:text-white">Top Destinations</h3>
          {topDestinations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No records found in this collection.</p>
          ) : (
            <div className="space-y-3">
              {topDestinations.map(([name, count], index) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-sm dark:text-gray-300">
                    <span>
                      {index + 1}. {name}
                    </span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10">
                    <div className="h-2 rounded-full bg-[#00A651]" style={{ width: `${(count / maxDest) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <BookingPerformanceChart bookings={bookings} loading={loading} />
      </div>
    </div>
  );
}

export default function AdminOverviewRoute() {
  return (
    <AdminCountsProvider>
      <AdminOverviewPage />
    </AdminCountsProvider>
  );
}
