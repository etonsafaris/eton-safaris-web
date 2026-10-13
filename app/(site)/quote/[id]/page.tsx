'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PublicShellServer from '@/components/public/PublicShellServer';
import { QuoteContactFooter, QuoteLetterhead } from '@/components/public/QuoteLetterhead';
import { fetchCollectionRecords, pickString } from '@/lib/data';
import { QUOTE_TERMS_SUMMARY } from '@/lib/quote-document';
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

  const fee = useMemo(() => pickString(quote || {}, ['agreed_price', 'total_price', 'base_price']), [quote]);
  const accepted = /accepted/i.test(pickString(quote || {}, ['status']));

  async function accept() {
    if (!quote?.id) return;
    if (accepted) {
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
      const next = new URLSearchParams();
      const tour = pickString(quote, ['tour']);
      if (tour) next.set('tour', tour);
      if (body.bookingId) next.set('booking', String(body.bookingId));
      router.push(`/payment?${next.toString()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not accept this quotation.');
      setSaving(false);
    }
  }

  return (
    <PublicShellServer>
      <section className="bg-[#eef2f0] px-4 py-12">
        <div className="mx-auto max-w-[760px] overflow-hidden rounded-xl bg-white shadow-[0_8px_28px_rgba(27,67,50,0.12)]">
          {!quote ? (
            <p className="p-10 text-center text-gray-500">Quotation not found.</p>
          ) : (
            <>
              <QuoteLetterhead />

              <div className="px-7 py-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#20A048]">Safari quotation</p>
                <h1 className="mt-1 font-serif text-2xl text-[#111827]">
                  {pickString(quote, ['tour']) || 'Tailored safari'}
                </h1>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Status: {pickString(quote, ['status']) || 'Quoted'}
                </p>

                <dl className="mt-6 space-y-0 text-sm">
                  {[
                    [
                      'Guest',
                      `${pickString(quote, ['name', 'guest_name'])}${
                        pickString(quote, ['email']) ? ` · ${pickString(quote, ['email'])}` : ''
                      }`,
                    ],
                    ['Phone', pickString(quote, ['phone'])],
                    ['Country / destination', pickString(quote, ['destination', 'country'])],
                    ['Travellers', pickString(quote, ['guests']) || '—'],
                    ['Travel date', pickString(quote, ['travel_date']).slice(0, 10) || 'Flexible'],
                    [
                      'Validity',
                      pickString(quote, ['expiration_days'])
                        ? `Valid for ${pickString(quote, ['expiration_days'])} days from issue`
                        : '',
                    ],
                  ]
                    .filter(([, value]) => Boolean(value && String(value).trim()))
                    .map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 border-b border-[#e8efe9] py-2.5">
                        <dt className="text-[#6b7280]">{label}</dt>
                        <dd className="text-right text-[#111827]">{value}</dd>
                      </div>
                    ))}
                </dl>

                {fee ? (
                  <div className="mt-5 rounded-r-lg border-l-4 border-[#20A048] bg-[#f0fdf4] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#166534]">Tour fee</p>
                    <p className="mt-1 text-2xl font-bold text-[#14532d]">{fee}</p>
                  </div>
                ) : null}

                {pickString(quote, ['message']) ? (
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">
                    {pickString(quote, ['message'])}
                  </p>
                ) : null}

                <p className="mt-5 rounded-lg bg-[#f7faf8] px-3 py-2 text-xs leading-relaxed text-[#6b7280]">
                  <strong className="text-[#374151]">Terms (summary):</strong> {QUOTE_TERMS_SUMMARY}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={accept}
                    disabled={saving || accepted}
                    className="rounded-lg bg-[#20A048] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Accepting…' : accepted ? 'Already accepted' : 'Accept and Book This Tour'}
                  </button>
                  <Link
                    href="/contact-us"
                    className="rounded-lg border border-[#e5e7eb] px-5 py-3 text-sm font-semibold text-[#14532d]"
                  >
                    Talk to us
                  </Link>
                </div>
                {status ? <p className="mt-4 text-sm text-[#20A048]">{status}</p> : null}
              </div>

              <QuoteContactFooter />
            </>
          )}
        </div>
      </section>
    </PublicShellServer>
  );
}
