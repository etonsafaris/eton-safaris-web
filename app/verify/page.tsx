'use client';

import { useState } from 'react';
import PublicShell from '@/components/public/PublicShell';
import PageHero from '@/components/public/PageHero';
import { supabase } from '@/lib/supabase/client';
import { pickNumber, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export default function VerifyBookingPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<RecordRow | null>(null);
  const [checkedAt, setCheckedAt] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBooking(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('bookings')
      .select('*')
      .ilike('booking_code', trimmed)
      .limit(1);
    setLoading(false);
    if (queryError) {
      setError(queryError.message);
      return;
    }
    const match = ((data as RecordRow[]) || [])[0];
    if (!match) {
      setError('Error: Invalid Booking Code. Please check your spelling or contact support.');
      return;
    }
    setBooking(match);
    setCheckedAt(new Date().toLocaleString());
  }

  const total = booking ? pickNumber(booking, ['final_tour_price', 'total_price', 'amount'], 0) : 0;
  const paid = booking ? pickNumber(booking, ['amount_paid'], 0) : 0;
  const remaining = booking ? pickNumber(booking, ['remaining_balance'], Math.max(0, total - paid)) : 0;

  return (
    <PublicShell>
      <PageHero
        title="Verify Your Booking"
        subtitle="Enter the SAF- code from your confirmation email."
      />
      <section className="mx-auto max-w-2xl px-4 py-12">
        <form onSubmit={verify} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Enter your Booking Code to verify status"
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-moss"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-full bg-[#006400] py-3 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-60"
          >
            {loading ? 'Checking…' : 'Verify Booking'}
          </button>
        </form>
        {error && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        {booking && (
          <article className="mt-8 rounded-2xl border border-amber-200 bg-[#fffdf5] p-6 shadow-card">
            <p className="inline-flex rounded-full bg-[#006400] px-4 py-1 text-sm font-semibold text-white">
              STATUS: BOOKING CONFIRMED
            </p>
            <dl className="mt-6 grid gap-3 text-sm text-gray-800">
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Guest name</dt>
                <dd className="mt-1 font-semibold">{pickString(booking, ['guest_name', 'name'])}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Safari package</dt>
                <dd className="mt-1">{pickString(booking, ['tour'])}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Total cost</dt>
                <dd className="mt-1">{total ? `USD ${total.toFixed(2)}` : 'Agreed with tour operator'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Amount paid</dt>
                <dd className="mt-1">USD {paid.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Remaining balance</dt>
                <dd className="mt-1">USD {remaining.toFixed(2)}</dd>
              </div>
            </dl>
            {checkedAt && <p className="mt-4 text-xs text-gray-500">Verified at {checkedAt}</p>}
          </article>
        )}
      </section>
    </PublicShell>
  );
}
