'use client';

import { useState } from 'react';
import PublicShell from '@/components/public/PublicShell';
import PageHero from '@/components/public/PageHero';
import { paymentSummary, verifyStatusClass, verifyStatusLabel } from '@/lib/booking-status';
import { pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function money(amount: number, currency = 'USD') {
  if (!Number.isFinite(amount)) return '—';
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
    try {
      const response = await fetch('/api/public/verify-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const body = (await response.json().catch(() => ({}))) as { booking?: RecordRow; error?: string };
      if (!response.ok || !body.booking) {
        setError(body.error || 'Invalid booking or payment code. Please check your spelling or contact support.');
        return;
      }
      setBooking(body.booking);
      setCheckedAt(new Date().toLocaleString());
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify this booking.');
    } finally {
      setLoading(false);
    }
  }

  const summary = booking ? paymentSummary(booking) : null;
  const paidLabel =
    summary && summary.total > 0 && summary.balance <= 0.009
      ? 'Fully paid'
      : summary && summary.paid > 0
        ? 'Partially paid'
        : 'Not yet paid';

  return (
    <PublicShell>
      <PageHero
        title="Verify Your Booking"
        subtitle="Enter the booking / payment code from your confirmation email."
      />
      <section className="mx-auto max-w-2xl px-4 py-12">
        <form onSubmit={verify} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Enter your Booking Code or Payment Code"
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
        {booking && summary && (
          <article className="mt-8 rounded-2xl border border-amber-200 bg-[#fffdf5] p-6 shadow-card">
            <p className={`inline-flex rounded-full px-4 py-1 text-sm font-semibold text-white ${verifyStatusClass(booking)}`}>
              STATUS: {verifyStatusLabel(booking)}
            </p>
            <p className="mt-3 text-sm font-semibold text-[#111827]">{paidLabel}</p>
            <dl className="mt-6 grid gap-3 text-sm text-gray-800">
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Booking / payment code</dt>
                <dd className="mt-1 font-mono font-semibold">{pickString(booking, ['booking_code'])}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Guest name</dt>
                <dd className="mt-1 font-semibold">{pickString(booking, ['guest_name', 'name'])}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Safari package</dt>
                <dd className="mt-1">{pickString(booking, ['tour'])}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Travel date</dt>
                <dd className="mt-1">{pickString(booking, ['travel_date']).slice(0, 10) || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Booking status</dt>
                <dd className="mt-1">{summary.bookingStatus}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Payment status</dt>
                <dd className="mt-1">{summary.paymentStatus}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Final tour fee</dt>
                <dd className="mt-1">{money(summary.total, summary.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Amount paid</dt>
                <dd className="mt-1">{money(summary.paid, summary.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-moss">Remaining balance</dt>
                <dd className="mt-1 font-semibold">{money(summary.balance, summary.currency)}</dd>
              </div>
            </dl>
            {checkedAt && <p className="mt-4 text-xs text-gray-500">Verified at {checkedAt}</p>}
          </article>
        )}
      </section>
    </PublicShell>
  );
}
