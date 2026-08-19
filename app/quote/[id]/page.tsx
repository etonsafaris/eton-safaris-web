'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PublicShell from '@/components/public/PublicShell';
import PageHero from '@/components/public/PageHero';
import { SITE } from '@/lib/collections';
import { fetchCollectionRecords, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export default function GuestQuotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';
  const [quote, setQuote] = useState<RecordRow | null>(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCollectionRecords('quotations_inquiries', ['quotations'])
      .then((rows) => {
        setQuote(rows.find((row) => String(row.id) === id) || null);
      })
      .catch((error) => console.error(error));
  }, [id]);

  async function accept() {
    if (!quote?.id) return;
    if (/accepted/i.test(pickString(quote, ['status']))) {
      setStatus('This quotation is already accepted.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/quotes/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quote.id }),
      });
      const body = await response.json();
      if (!response.ok) {
        setStatus(String(body.error || 'Could not accept this quotation.'));
        setSaving(false);
        return;
      }
      const params = new URLSearchParams();
      const tour = pickString(quote, ['tour']);
      if (tour) params.set('tour', tour);
      if (body.bookingId) params.set('booking', String(body.bookingId));
      router.push(`/payment?${params.toString()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not accept this quotation.');
      setSaving(false);
    }
  }

  return (
    <PublicShell>
      <PageHero title="Your safari quotation" subtitle={quote ? `Status: ${pickString(quote, ['status']) || 'Quoted'}` : undefined} />
      <section className="mx-auto max-w-3xl px-4 py-16">
        {!quote ? (
          <p className="text-center text-gray-500">Quotation not found.</p>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">{SITE.name}</p>
            <p className="mt-2 text-sm text-gray-500">Status: {pickString(quote, ['status']) || 'Quoted'}</p>
            <dl className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between border-b py-2">
                <dt className="text-gray-500">Guest</dt>
                <dd>{pickString(quote, ['name', 'guest_name'])}</dd>
              </div>
              <div className="flex justify-between border-b py-2">
                <dt className="text-gray-500">Tour</dt>
                <dd>{pickString(quote, ['tour'])}</dd>
              </div>
              <div className="flex justify-between border-b py-2">
                <dt className="text-gray-500">Guests</dt>
                <dd>{pickString(quote, ['guests']) || '—'}</dd>
              </div>
              <div className="flex justify-between border-b py-2">
                <dt className="text-gray-500">Travel date</dt>
                <dd>{pickString(quote, ['travel_date']).slice(0, 10) || 'Flexible'}</dd>
              </div>
            </dl>
            {pickString(quote, ['message']) && (
              <p className="mt-6 leading-relaxed text-gray-700">{pickString(quote, ['message'])}</p>
            )}
            <p className="mt-6 text-sm text-gray-500">
              Final price and day-by-day itinerary are confirmed privately with your tour operator and are not shown on this quotation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={accept}
                disabled={saving || /accepted/i.test(pickString(quote, ['status']))}
                className="rounded-lg bg-moss-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Accepting…' : 'Accept and Book This Tour'}
              </button>
              <Link href="/contact-us" className="rounded-lg border px-5 py-3 text-sm font-semibold text-forest">
                Talk to us
              </Link>
            </div>
            {status && <p className="mt-4 text-sm text-moss">{status}</p>}
          </div>
        )}
      </section>
    </PublicShell>
  );
}
