'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, X } from 'lucide-react';
import SearchableSelect from '@/components/admin/SearchableSelect';
import { SITE } from '@/lib/collections';
import { fetchCollectionRecords, getRecordTitle, pickString } from '@/lib/data';
import { gmailComposeHref, notifyWorkspace } from '@/lib/notify';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

type TabId = 'pending' | 'quoted' | 'all';

function quoteHtml(input: {
  guest: string;
  email: string;
  tour: string;
  guests: string;
  travelDate: string;
  notes: string;
  quoteId?: string;
}) {
  const link = input.quoteId ? `https://etonsafaris.com/quote/${input.quoteId}` : '';
  return `<!DOCTYPE html><html><head><title>Safari quotation</title>
    <style>body{font-family:Georgia,serif;padding:40px;color:#1f2937;max-width:720px;margin:0 auto}h1{color:#14532d}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #e5e7eb}.note{color:#6b7280;font-size:13px;margin-top:24px}</style>
    </head><body>
    <p>${SITE.name}</p>
    <h1>Safari Quotation</h1>
    <table>
      <tr><td>Guest</td><td>${input.guest} (${input.email})</td></tr>
      <tr><td>Tour</td><td>${input.tour}</td></tr>
      <tr><td>Guests</td><td>${input.guests}</td></tr>
      <tr><td>Travel date</td><td>${input.travelDate || 'Flexible'}</td></tr>
    </table>
    <p>${input.notes || 'A tailored safari itinerary will be confirmed with you directly.'}</p>
    ${link ? `<p><a href="${link}">View and accept this quotation</a></p>` : ''}
    <p class="note">Price and day-by-day itinerary are confirmed privately with your tour operator and are not included in this guest quotation.</p>
    <p>Contact ${SITE.email} · ${SITE.phoneDisplay}</p>
    </body></html>`;
}

function displayOrDash(value: string) {
  return value.trim() || '—';
}

function inquiryStatus(row: RecordRow) {
  return pickString(row, ['status']) || 'Pending';
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-[#4b5563]">
      <span className="font-semibold text-[#111827]">{label}:</span> {displayOrDash(value)}
    </p>
  );
}

export default function QuotationPanel() {
  const searchParams = useSearchParams();
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [inquiries, setInquiries] = useState<RecordRow[]>([]);
  const [tab, setTab] = useState<TabId>('pending');
  const [tourId, setTourId] = useState('');
  const [inquiryId, setInquiryId] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    guests: '1',
    travel_date: '',
    message: '',
    agreed_price: '',
    expiration_days: '14',
  });
  const [status, setStatus] = useState('');
  const [savedId, setSavedId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [tourRows, quoteRows, inquiryRows] = await Promise.all([
      fetchCollectionRecords('tours'),
      fetchCollectionRecords('quotations_inquiries', ['quotations']),
      fetchCollectionRecords('inquiries', ['contact_inquiries']),
    ]);
    setTours(tourRows);
    setRows(quoteRows);
    setInquiries(inquiryRows);
  }

  useEffect(() => {
    load().catch((loadError) => console.error(loadError));
  }, []);

  const selected = useMemo(
    () => tours.find((tour) => String(tour.id) === tourId) || null,
    [tourId, tours]
  );

  const pendingInquiries = useMemo(() => {
    const fromInquiries = inquiries.filter((row) => {
      const value = inquiryStatus(row).toLowerCase();
      return value === 'pending' || value === '' || value === 'inquiry';
    });
    const fromQuotes = rows.filter((row) => {
      const value = inquiryStatus(row).toLowerCase();
      const title = `${pickString(row, ['title', 'source', 'message'])}`.toLowerCase();
      const pending = value === 'pending' || value === '' || value === 'inquiry';
      return pending && (title.includes('agent') || title.includes('inquiry'));
    });
    const seen = new Set(fromInquiries.map((row) => String(row.id ?? pickString(row, ['email']))));
    return [
      ...fromInquiries,
      ...fromQuotes.filter((row) => {
        const key = String(row.id ?? pickString(row, ['email']));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    ];
  }, [inquiries, rows]);
  const quotedRows = rows.filter((row) => /quoted|quote sent|accepted/i.test(pickString(row, ['status']) || 'Quoted'));

  function fillFromInquiry(row: RecordRow) {
    setInquiryId(String(row.id || ''));
    setSavedId('');
    setStatus('');
    setError('');
    setForm({
      name: pickString(row, ['name', 'guest_name']),
      email: pickString(row, ['email']),
      guests: pickString(row, ['guests']) || '1',
      travel_date: pickString(row, ['travel_date']).slice(0, 10),
      message: pickString(row, ['message', 'budget']),
      agreed_price: '',
      expiration_days: '14',
    });
    const tourName = pickString(row, ['tour', 'destination']);
    if (tourName) {
      const match = tours.find((tour) => getRecordTitle(tour).toLowerCase() === tourName.toLowerCase());
      setTourId(match?.id !== undefined ? String(match.id) : '');
    } else {
      setTourId('');
    }
    setComposerOpen(true);
  }

  useEffect(() => {
    const email = searchParams.get('email') || '';
    if (!email.includes('@') && !searchParams.get('name')) return;
    setInquiryId('');
    setSavedId('');
    setStatus('');
    setError('');
    setForm({
      name: searchParams.get('name') || '',
      email,
      guests: searchParams.get('guests') || '1',
      travel_date: (searchParams.get('travel_date') || '').slice(0, 10),
      message: searchParams.get('message') || '',
      agreed_price: '',
      expiration_days: '14',
    });
    const tourName = searchParams.get('tour') || '';
    if (tourName && tours.length) {
      const match = tours.find((tour) => getRecordTitle(tour).toLowerCase() === tourName.toLowerCase());
      setTourId(match?.id !== undefined ? String(match.id) : '');
    }
    setComposerOpen(true);
  }, [searchParams, tours]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!tourId) {
      setStatus('Select a tour package first.');
      return;
    }
    const payload = buildSavePayload('quotations_inquiries', {
      name: form.name,
      email: form.email,
      tour: selected ? getRecordTitle(selected) : '',
      message: form.message,
      guests: form.guests,
      travel_date: form.travel_date,
      agreed_price: form.agreed_price,
      expiration_days: form.expiration_days,
      inquiry_id: inquiryId || null,
      status: 'Quoted',
    });
    const result = await saveWithColumnFallback('quotations_inquiries', payload);
    if (result.error) {
      setStatus(result.error.message);
      return;
    }

    await notifyAdminItemSaved({
      module: 'Quotation',
      action: 'created',
      item: { ...payload, ...(result.data?.[0] || {}) },
    });

    if (inquiryId) {
      await saveWithColumnFallback('inquiries', { status: 'Quote Sent' }, inquiryId);
    }

    const latest = await fetchCollectionRecords('quotations_inquiries', ['quotations']);
    const match = latest.find(
      (row) => pickString(row, ['email']).toLowerCase() === form.email.trim().toLowerCase()
    );
    const quoteId = match?.id ? String(match.id) : '';
    setSavedId(quoteId);

    await notifyWorkspace({
      title: 'Safari quotation',
      message: `Dear ${form.name}, your safari quotation for ${selected ? getRecordTitle(selected) : 'your tour'} is ready. View and accept it here: https://etonsafaris.com/quote/${quoteId || ''}`,
      category: 'inquiry',
      guestEmail: form.email,
      sendToGuest: true,
    });

    setStatus('Quote sent to the guest. Price and itinerary stay internal.');
    setTab('quoted');
    await load();
  }

  function printQuote() {
    const popup = window.open('', '_blank');
    if (!popup) return;
    popup.document.write(
      quoteHtml({
        guest: form.name,
        email: form.email,
        tour: selected ? getRecordTitle(selected) : 'Safari quotation',
        guests: form.guests,
        travelDate: form.travel_date,
        notes: form.message,
        quoteId: savedId,
      })
    );
    popup.document.close();
    popup.print();
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending Inquiries', count: pendingInquiries.length },
    { id: 'quoted', label: 'Quoted', count: quotedRows.length },
    { id: 'all', label: 'All Quotations', count: rows.length },
  ];

  const visibleCards =
    tab === 'pending' ? pendingInquiries : tab === 'quoted' ? quotedRows : rows;

  return (
    <div>
      <h2 className="font-serif text-3xl font-bold text-[#111827]">Quotation & Inquiry Manager</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Select a tour package to auto-populate quotations, generate a professional PDF, and send to the guest.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                active
                  ? 'bg-[#6b7c3a] text-white'
                  : 'border border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#f9fafb]'
              }`}
            >
              {item.label} ({item.count})
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-4">
        {visibleCards.length === 0 ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white py-12 text-center text-sm text-[#6b7280]">
            No records in this tab yet.
          </div>
        ) : (
          visibleCards.map((row, index) => {
            const pending = tab === 'pending';
            const badge = pending ? inquiryStatus(row) : pickString(row, ['status']) || 'Quoted';
            return (
              <article
                key={String(row.id ?? index)}
                className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-[#111827]">
                      {pickString(row, ['name', 'guest_name']) || 'Guest'}
                    </h3>
                    {/agent/i.test(pickString(row, ['title', 'source', 'message'])) ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                        From agent
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        pending ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {badge}
                    </span>
                  </div>
                  {pending ? (
                    <button
                      type="button"
                      onClick={() => fillFromInquiry(row)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#6b7c3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c6b32]"
                    >
                      <FileText className="h-4 w-4" />
                      Create Quote
                    </button>
                  ) : (
                    row.id !== undefined && (
                      <Link
                        href={`/quote/${row.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#6b7c3a] px-4 py-2 text-sm font-semibold text-[#6b7c3a]"
                      >
                        Guest view
                      </Link>
                    )
                  )}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Field label="Email" value={pickString(row, ['email'])} />
                    <Field label="Destination" value={pickString(row, ['destination', 'tour', 'title'])} />
                    <Field label="Guests" value={pickString(row, ['guests']) || '1'} />
                  </div>
                  <div className="space-y-1.5">
                    <Field label="Phone" value={pickString(row, ['phone'])} />
                    <Field label="Travel Date" value={pickString(row, ['travel_date']).slice(0, 10)} />
                    <Field label="Budget" value={pickString(row, ['budget', 'message'])} />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <form onSubmit={save} className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-2xl">Create Quote</h3>
              <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close quote form">
                <X />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <SearchableSelect
                  value={tourId}
                  onChange={setTourId}
                  options={tours.map((tour) => ({
                    value: String(tour.id),
                    label: getRecordTitle(tour),
                  }))}
                  placeholder="Select tour package"
                />
              </div>
              <input
                required
                placeholder="Guest name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Guest email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Guests"
                value={form.guests}
                onChange={(event) => setForm({ ...form, guests: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                type="date"
                value={form.travel_date}
                onChange={(event) => setForm({ ...form, travel_date: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Agreed / final tour price (admin only)"
                value={form.agreed_price}
                onChange={(event) => setForm({ ...form, agreed_price: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Expiration days"
                value={form.expiration_days}
                onChange={(event) => setForm({ ...form, expiration_days: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <textarea
                placeholder="Guest-facing notes (no price or itinerary)"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                className="sm:col-span-2 h-24 rounded-lg border px-3 py-2.5 text-sm"
              />
              {selected && (
                <div className="sm:col-span-2 rounded-lg bg-cream p-4 text-sm text-gray-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-moss">Internal only</p>
                  <p className="mt-1 font-semibold">{getRecordTitle(selected)}</p>
                  <p>
                    {pickString(selected, ['price'])} · {pickString(selected, ['duration_days', 'country'])}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" className="rounded-lg bg-[#6b7c3a] px-4 py-2 text-sm font-semibold text-white">
                Send Quote
              </button>
              <button type="button" onClick={printQuote} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                Print / PDF
              </button>
              {form.email && (
                <a
                  href={gmailComposeHref(form.email, `Safari quotation from ${SITE.name}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-moss"
                >
                  Email guest
                </a>
              )}
              {savedId && (
                <Link href={`/quote/${savedId}`} target="_blank" className="rounded-lg border px-4 py-2 text-sm font-semibold">
                  Guest quote link
                </Link>
              )}
            </div>
            {status && <p className="mt-3 text-sm text-moss">{status}</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
