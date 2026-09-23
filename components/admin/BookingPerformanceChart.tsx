'use client';

import { useMemo, useState } from 'react';
import { Calendar, LineChart } from 'lucide-react';
import { AdminGlassCard } from '@/components/admin/AdminGlassCard';
import { pickDateValue } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function bookingMonthDate(booking: RecordRow): Date | null {
  const raw = pickDateValue(booking, [
    'created_at',
    'booked_at',
    'booking_date',
    'travel_date',
    'date',
    'updated_at',
  ]);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function yScale(maxValue: number) {
  const target = Math.max(4, maxValue);
  const rough = target / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough || 1));
  const normalized = rough / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = Math.max(1, nice * magnitude);
  const top = Math.ceil(target / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { top, ticks };
}

export default function BookingPerformanceChart({
  bookings,
  loading,
  variant = 'default',
}: {
  bookings: RecordRow[];
  loading?: boolean;
  variant?: 'default' | 'dav';
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [hover, setHover] = useState<number | null>(null);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const booking of bookings) {
      const date = bookingMonthDate(booking);
      if (date) years.add(date.getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [bookings, currentYear]);

  const monthly = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0);
    for (const booking of bookings) {
      const date = bookingMonthDate(booking);
      if (!date || date.getFullYear() !== year) continue;
      counts[date.getMonth()] += 1;
    }
    return counts;
  }, [bookings, year]);

  const total = monthly.reduce((sum, count) => sum + count, 0);
  const { top, ticks } = yScale(Math.max(...monthly));

  const chartBody = (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {variant === 'dav' ? (
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <LineChart className="h-5 w-5" />
            </div>
          ) : null}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Booking Performance</h3>
            <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {variant === 'dav' ? `Monthly trends for ${year}` : `Bookings created each month in ${year}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {variant === 'dav' ? (
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-8 text-sm font-semibold transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : total}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">this year</p>
          </div>
        </div>
      </div>

      <div className="relative h-64 overflow-visible sm:h-72">
        <div className="absolute inset-0 ml-8 flex flex-col pb-6">
          <div className="relative flex-1">
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute right-0 left-0 border-t border-dashed border-[#e5e7eb] dark:border-white/10"
                style={{ bottom: `${(tick / top) * 100}%` }}
              >
                <span className="absolute -left-8 -translate-y-1/2 w-7 text-right text-[11px] leading-none text-[#9ca3af]">
                  {tick}
                </span>
              </div>
            ))}
            <div className="absolute inset-0 flex items-end gap-1.5 px-1 sm:gap-2.5 sm:px-2">
              {monthly.map((count, index) => {
                const height = top > 0 ? (count / top) * 100 : 0;
                return (
                  <button
                    key={MONTHS[index]}
                    type="button"
                    className="relative flex h-full flex-1 items-end justify-center"
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(index)}
                    onBlur={() => setHover(null)}
                    aria-label={`${MONTHS[index]} ${year}: ${count} booking${count === 1 ? '' : 's'}`}
                  >
                    {hover === index && (
                      <span
                        className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-[11px] font-medium text-white shadow-sm"
                        style={{ bottom: `calc(${count > 0 ? Math.max(6, height) : 0}% + 8px)` }}
                      >
                        {MONTHS[index]} {year}: {count} booking{count === 1 ? '' : 's'}
                      </span>
                    )}
                    <span
                      className={`w-[70%] max-w-[2.5rem] rounded-t-md bg-[#00A651] transition-opacity ${
                        hover === null || hover === index ? 'opacity-100' : 'opacity-45'
                      }`}
                      style={{ height: count > 0 ? `${Math.max(6, height)}%` : '0%' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex gap-1.5 px-1 sm:gap-2.5 sm:px-2">
            {MONTHS.map((month, index) => (
              <span
                key={month}
                className={`flex-1 text-center text-[11px] ${
                  hover === index ? 'font-semibold text-[#111827] dark:text-white' : 'text-[#6b7280] dark:text-gray-400'
                }`}
              >
                {month}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  if (variant === 'dav') {
    return <AdminGlassCard className="p-6">{chartBody}</AdminGlassCard>;
  }

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
      {chartBody}
    </div>
  );
}
