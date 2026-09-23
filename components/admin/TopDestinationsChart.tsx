'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { AdminGlassCard } from '@/components/admin/AdminGlassCard';
import { pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export default function TopDestinationsChart({ bookings }: { bookings: RecordRow[] }) {
  const rows = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const booking of bookings) {
      const dest = pickString(booking, ['destination', 'country', 'tour']) || 'Other';
      counts[dest] = (counts[dest] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [bookings]);

  const max = rows[0]?.[1] || 1;

  return (
    <AdminGlassCard className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Destinations</h3>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Top 10 booking sources</p>
        </div>
      </div>
      <div className="min-h-[300px] space-y-4">
        {rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No booking data yet.</p>
        ) : (
          rows.map(([name, count], index) => (
            <div key={name}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-gray-800 dark:text-gray-200">
                  <span className="mr-2 text-gray-400">{index + 1}.</span>
                  {name}
                </span>
                <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">{count}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </AdminGlassCard>
  );
}
