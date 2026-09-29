'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ClipboardList,
  Compass,
  Globe2,
  Newspaper,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminCountsProvider, useAdminCounts } from '@/components/admin/AdminCountsProvider';
import { AdminGlassCard } from '@/components/admin/AdminGlassCard';
import BookingPerformanceChart from '@/components/admin/BookingPerformanceChart';
import TopDestinationsChart from '@/components/admin/TopDestinationsChart';
import { MAIN_COLLECTIONS, SITE, SYSTEM_COLLECTIONS } from '@/lib/collections';
import { fetchAdminTable } from '@/lib/admin-records-client';
import { pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function formatDavToday(date: Date) {
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th';
  return `${date.toLocaleDateString('en-US', { month: 'long' })} ${day}${suffix}, ${date.getFullYear()}`;
}

type StatCard = {
  title: string;
  value: number | string;
  loading: boolean;
  href: string;
  icon: typeof ClipboardList;
  color: 'emerald' | 'violet' | 'amber' | 'sky';
  trend?: string;
};

const colorClasses = {
  emerald: {
    icon: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    glow: 'bg-emerald-500/5',
  },
  violet: {
    icon: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    glow: 'bg-violet-500/5',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    glow: 'bg-amber-500/5',
  },
  sky: {
    icon: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
    glow: 'bg-sky-500/5',
  },
};

/** Shown as the four top KPI cards — everything else goes in Quick access. */
const OVERVIEW_STAT_MODULE_IDS = new Set(['tours', 'bookings', 'safari_updates', 'registered_agents']);

function adminModuleHref(id: string) {
  return id === 'overview' ? '/admin' : `/admin/${id}`;
}

function bookedCountriesCount(bookings: RecordRow[]) {
  const set = new Set<string>();
  for (const booking of bookings) {
    const value = pickString(booking, ['country', 'destination'])?.trim().toLowerCase();
    if (value) set.add(value);
  }
  return set.size;
}

function AdminDavDashboardInner() {
  const router = useRouter();
  const { counts, loading: countsLoading } = useAdminCounts();
  const [bookings, setBookings] = useState<RecordRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchAdminTable('bookings')
      .then((rows) => {
        if (mounted) setBookings(rows);
      })
      .catch(() => {
        if (mounted) setBookings([]);
      })
      .finally(() => {
        if (mounted) setBookingsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stats: StatCard[] = useMemo(
    () => [
      {
        title: 'Total Bookings',
        value: counts.bookings ?? bookings.length,
        loading: countsLoading,
        icon: ClipboardList,
        color: 'emerald',
        href: '/admin/bookings',
        trend: bookings.length > 0 ? 'Live' : undefined,
      },
      {
        title: 'Tour Packages',
        value: counts.tours ?? 0,
        loading: countsLoading,
        icon: Compass,
        color: 'violet',
        href: '/admin/tours',
      },
      {
        title: 'Safari Updates',
        value: counts.safari_updates ?? 0,
        loading: countsLoading,
        icon: Newspaper,
        color: 'amber',
        href: '/admin/safari_updates',
      },
      {
        title: 'Registered Agents',
        value: counts.registered_agents ?? 0,
        loading: countsLoading,
        icon: Users,
        color: 'sky',
        href: '/admin/registered_agents',
      },
    ],
    [bookings.length, bookingsLoading, counts, countsLoading]
  );

  const activeCountries = counts.countries ?? 0;
  const bookedCountries = bookedCountriesCount(bookings);
  const quickAccessModules = useMemo(
    () =>
      [...MAIN_COLLECTIONS, ...SYSTEM_COLLECTIONS].filter(
        (item) => item.id !== 'overview' && !OVERVIEW_STAT_MODULE_IDS.has(item.id)
      ),
    []
  );

  return (
    <div className="admin-dav-dashboard space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Welcome back! Here&apos;s what&apos;s happening with {SITE.name} today.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/50 px-4 py-2 shadow-sm backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/50">
          <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-gray-400">Today</span>
            <span className="text-sm font-bold leading-tight text-gray-900 dark:text-white">
              {formatDavToday(new Date())}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((card, index) => {
          const colors = colorClasses[card.color];
          const Icon = card.icon;
          return (
            <AdminGlassCard
              key={card.title}
              hoverable
              onClick={() => router.push(card.href)}
              style={{ animationDelay: `${100 * index}ms` }}
              className="group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-2xl p-3 transition-transform duration-300 group-hover:scale-110 ${colors.icon}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {card.trend ? (
                    <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-3 w-3" />
                      {card.trend}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {card.title}
                  </h4>
                  <div className="mt-1 flex items-baseline gap-2">
                    {card.loading ? (
                      <div className="h-8 w-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    ) : (
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div
                className={`absolute -bottom-4 -right-4 h-24 w-24 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-150 ${colors.glow}`}
              />
            </AdminGlassCard>
          );
        })}
      </div>

      <AdminGlassCard>
        <div className="flex flex-col items-center divide-y divide-gray-100 dark:divide-gray-800 md:flex-row md:divide-x md:divide-y-0">
          <div className="flex-1 p-8 text-center md:text-left">
            <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Active Countries</div>
            <div className="flex items-center justify-center gap-4 md:justify-start">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {countsLoading ? '…' : activeCountries.toLocaleString()}
              </div>
              <div className="mx-2 h-8 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-tighter text-emerald-600 dark:text-emerald-400">
                  Market Reach
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Global presence across regions</div>
              </div>
            </div>
          </div>
          <div className="flex-1 p-8 text-center md:text-left">
            <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Booked Countries</div>
            <div className="flex items-center justify-center gap-4 md:justify-start">
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                {bookingsLoading ? '…' : bookedCountries.toLocaleString()}
              </div>
              <div className="mx-2 h-8 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-tighter text-emerald-600 dark:text-emerald-400">
                  Conversion Rate
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Countries with active sales</div>
              </div>
            </div>
          </div>
        </div>
      </AdminGlassCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BookingPerformanceChart bookings={bookings} loading={bookingsLoading} variant="dav" />
        <TopDestinationsChart bookings={bookings} />
      </div>

      <AdminGlassCard className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick access</h3>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Jump to any admin module</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quickAccessModules.map((item) => (
            <Link
              key={item.id}
              href={adminModuleHref(item.id)}
              className="flex items-center justify-between gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-emerald-500/10"
            >
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400">
                {item.table ? (counts[item.id] ?? 0).toLocaleString() : 'Open'}
              </span>
            </Link>
          ))}
        </div>
      </AdminGlassCard>
    </div>
  );
}

export default function AdminDavDashboard() {
  return (
    <AdminCountsProvider>
      <AdminDavDashboardInner />
    </AdminCountsProvider>
  );
}
