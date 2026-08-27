'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Trash2, X } from 'lucide-react';
import SearchableSelect from '@/components/admin/SearchableSelect';
import { QuoteContactFooter, QuoteLetterhead } from '@/components/public/QuoteLetterhead';
import { NAV_COUNTRIES, OTHER_DESTINATIONS, SITE } from '@/lib/collections';
import { deleteAdminRecord, fetchAdminTable } from '@/lib/admin-records-client';
import { clearCollectionCache, adminListColumnsFor, fetchCollectionRecords, getRecordTitle, pickString } from '@/lib/data';
import { gmailComposeHref, notifyWorkspace } from '@/lib/notify';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import {
  buildQuoteDocumentHtml,
  packageDetailsForQuote,
  parseInquiryGuestFields,
  QUOTE_TERMS_SUMMARY,
} from '@/lib/quote-document';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

type TabId = 'inquiry' | 'quoted' | 'all';
type InquirySource = 'inquiries' | 'quotations_inquiries';

type InquiryCard = RecordRow & { _source: InquirySource };

function displayOrDash(value: string) {
  return value.trim() || '—';
}

function inquiryStatus(row: RecordRow) {
  return pickString(row, ['status']) || 'Pending';
}

function isPendingStatus(value: string) {
  const v = value.toLowerCase().trim();
  if (/quoted|quote sent|accepted|closed/i.test(v)) return false;
  return !v || v === 'pending' || v === 'inquiry' || v === 'new';
}

function isQuotedStatus(value: string) {
  return /quoted|quote sent|accepted/i.test(value.trim());
}

/** Format created/quoted stamps as local date + time for admin cards. */
function formatDateTime(value: string) {
  const raw = value.trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function recordReceivedAt(row: RecordRow) {
  return (
    pickString(row, ['created_at', 'createdAt', 'created_date', 'createdDate']) ||
    pickString(row, ['published_at', 'updated_at'])
  );
}

function recordQuotedAt(row: RecordRow) {
  return (
    pickString(row, ['quoted_at', 'quotedAt']) ||
    (isQuotedStatus(pickString(row, ['status']))
      ? pickString(row, ['updated_at', 'updatedAt', 'updated_date'])
      : '')
  );
}

async function loadOpsTable(table: string, aliases: string[] = []): Promise<RecordRow[]> {
  try {
    return await fetchAdminTable(table);
  } catch (adminError) {
    console.warn(`[Quotations] Admin API failed for ${table}:`, adminError);
  }
  try {
    clearCollectionCache(table);
    aliases.forEach((alias) => clearCollectionCache(alias));
    return await fetchCollectionRecords(table, aliases);
  } catch (clientError) {
    console.warn(`[Quotations] Client fetch failed for ${table}:`, clientError);
    return [];
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-[#4b5563]">
      <span className="font-semibold text-[#111827]">{label}:</span> {displayOrDash(value)}
    </p>
  );
}

function sourceBadge(row: RecordRow) {
  const source = pickString(row, ['source', 'title', 'message']).toLowerCase();
  if (source.includes('agent')) return { label: 'Agent', className: 'bg-sky-100 text-sky-800' };
  if (source.includes('quote')) return { label: 'Quote request', className: 'bg-violet-100 text-violet-800' };
  if (source.includes('contact') || source.includes('website inquiry')) {
    return { label: 'Contact', className: 'bg-amber-100 text-amber-800' };
  }
  return { label: 'Website', className: 'bg-slate-100 text-slate-700' };
}

const COUNTRY_OPTIONS = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS].map((item) => ({
  value: item.name,
  label: item.name,
}));

export default function QuotationPanel() {
  const searchParams = useSearchParams();
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [inquiries, setInquiries] = useState<RecordRow[]>([]);
  const [tab, setTab] = useState<TabId>('inquiry');
  const [tourId, setTourId] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [inquiryId, setInquiryId] = useState('');
  const [inquirySource, setInquirySource] = useState<InquirySource>('quotations_inquiries');
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    guests: '1',
    travel_date: '',
    message: '',
    agreed_price: '',
    expiration_days: '14',
    country: '',
    duration: '',
    highlights: '',
  });
  const [status, setStatus] = useState('');
  const [savedId, setSavedId] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [tourRows, quoteRows, inquiryRows] = await Promise.all([
        fetchCollectionRecords('tours', [], {
          columns: adminListColumnsFor('tours') || 'id,title,country,category,price,image_url',
          maxRows: 80,
        }).catch((tourError) => {
          console.warn('[Quotations] Tours load failed:', tourError);
          return [] as RecordRow[];
        }),
        // Admin API bypasses RLS — same path as Bookings / Notifications.
        loadOpsTable('quotations_inquiries', ['quotations']),
        loadOpsTable('inquiries', ['contact_inquiries']),
      ]);
      setTours(tourRows);
      setRows(
        quoteRows.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      );
      setInquiries(
        inquiryRows.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      );
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Could not load quotations and inquiries.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((loadError) => console.error(loadError));
  }, []);

  const selected = useMemo(
    () => tours.find((tour) => String(tour.id) === tourId) || null,
    [tourId, tours]
  );

  const durationOptions = useMemo(() => {
    const values = new Set<string>();
    tours.forEach((tour) => {
      const days = pickString(tour, ['duration_days', 'duration']);
      if (days) values.add(days);
    });
    return Array.from(values).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [tours]);

  const filteredTours = useMemo(() => {
    return tours.filter((tour) => {
      if (filterCountry) {
        const country = pickString(tour, ['country', 'destination']).toLowerCase();
        if (!country.includes(filterCountry.toLowerCase())) return false;
      }
      if (filterDuration) {
        const days = pickString(tour, ['duration_days', 'duration']);
        if (days !== filterDuration) return false;
      }
      return true;
    });
  }, [tours, filterCountry, filterDuration]);

  const quotedRows = rows.filter((row) => isQuotedStatus(pickString(row, ['status'])));

  // If Inquiry is empty but All has pending-like rows, still surface them.
  const inquiryCards = useMemo(() => {
    const pendingQuotes = rows.filter((row) => isPendingStatus(inquiryStatus(row)));
    const pendingInquiries = inquiries.filter((row) => isPendingStatus(inquiryStatus(row)));
    const seen = new Set<string>();
    const cards: InquiryCard[] = [];

    for (const row of pendingQuotes) {
      const key = String(row.id ?? `${pickString(row, ['email'])}|${pickString(row, ['message']).slice(0, 40)}`);
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({ ...row, _source: 'quotations_inquiries' });
    }
    for (const row of pendingInquiries) {
      const email = pickString(row, ['email']).toLowerCase();
      const msg = pickString(row, ['message']).slice(0, 40).toLowerCase();
      const key = String(row.id ?? `${email}|${msg}`);
      const duplicate = cards.some(
        (card) =>
          pickString(card, ['email']).toLowerCase() === email &&
          pickString(card, ['message']).slice(0, 40).toLowerCase() === msg
      );
      if (duplicate || seen.has(key)) continue;
      seen.add(key);
      cards.push({ ...row, _source: 'inquiries' });
    }
    return cards;
  }, [inquiries, rows]);

  function applyTourSelection(id: string) {
    setTourId(id);
    const tour = tours.find((row) => String(row.id) === id);
    if (!tour) return;
    const country = pickString(tour, ['country', 'destination']);
    const durationRaw = pickString(tour, ['duration_days', 'duration']);
    const price = pickString(tour, ['price', 'base_price', 'agreed_price']);
    const packageDetails = packageDetailsForQuote(tour);
    setForm((current) => ({
      ...current,
      // Keep guest-entered fields; only fill package-side fields from the tour.
      country: country || current.country,
      duration: durationRaw ? `${durationRaw} days` : current.duration,
      agreed_price: price || current.agreed_price,
      highlights: packageDetails,
    }));
    if (country) setFilterCountry(country);
    if (durationRaw) setFilterDuration(durationRaw);
  }

  function fillFromInquiry(row: InquiryCard) {
    setInquiryId(String(row.id || ''));
    setInquirySource(row._source);
    setSavedId('');
    setStatus('');
    setError('');

    const rawMessage = pickString(row, ['message', 'budget']);
    const parsed = parseInquiryGuestFields(rawMessage);
    const countryHint =
      pickString(row, ['destination', 'country']) ||
      parsed.destination ||
      '';
    const guests =
      pickString(row, ['guests']) ||
      parsed.travellers ||
      '1';
    const travelDate =
      pickString(row, ['travel_date']).slice(0, 10) ||
      parsed.travelDate ||
      '';
    const durationHint = parsed.duration;
    const guestNotes = parsed.guestNotes || rawMessage;
    const tourHint = pickString(row, ['tour']) || parsed.tour || '';

    setForm({
      name: pickString(row, ['name', 'guest_name']),
      email: pickString(row, ['email']),
      phone: pickString(row, ['phone']),
      guests,
      travel_date: travelDate,
      message: guestNotes,
      agreed_price: '',
      expiration_days: '14',
      country: countryHint,
      duration: durationHint,
      highlights: '',
    });

    if (countryHint) setFilterCountry(countryHint);
    else setFilterCountry('');

    const durationDigits = durationHint.replace(/[^\d]/g, '');
    if (durationDigits) setFilterDuration(durationDigits);
    else setFilterDuration('');

    // Prefer an exact package match; otherwise match by country + title contains.
    const needle = tourHint.toLowerCase().trim();
    let match =
      (needle &&
        tours.find((tour) => getRecordTitle(tour).toLowerCase() === needle)) ||
      null;
    if (!match && needle) {
      match =
        tours.find((tour) => getRecordTitle(tour).toLowerCase().includes(needle)) ||
        tours.find((tour) => needle.includes(getRecordTitle(tour).toLowerCase())) ||
        null;
    }
    // Country alone only filters the package list — never auto-picks a random tour.

    if (match?.id !== undefined) applyTourSelection(String(match.id));
    else setTourId('');

    setComposerOpen(true);
  }

  useEffect(() => {
    const params = searchParams;
    if (!params) return;
    const inquiryParam = params.get('inquiry');
    const email = params.get('email') || '';
    const name = params.get('name') || '';
    if (!inquiryParam && !email.includes('@') && !name) return;

    if (inquiryParam) {
      const fromQuotes = rows.find((row) => String(row.id) === inquiryParam);
      const fromInquiries = inquiries.find((row) => String(row.id) === inquiryParam);
      if (fromQuotes) {
        fillFromInquiry({ ...fromQuotes, _source: 'quotations_inquiries' });
        return;
      }
      if (fromInquiries) {
        fillFromInquiry({ ...fromInquiries, _source: 'inquiries' });
        return;
      }
      // Wait until records load.
      if (!rows.length && !inquiries.length) return;
      return;
    }

    setInquiryId('');
    setInquirySource('quotations_inquiries');
    setSavedId('');
    setStatus('');
    setError('');
    setForm({
      name,
      email,
      phone: params.get('phone') || '',
      guests: params.get('guests') || '1',
      travel_date: (params.get('travel_date') || '').slice(0, 10),
      message: params.get('message') || '',
      agreed_price: '',
      expiration_days: '14',
      country: params.get('country') || params.get('destination') || '',
      duration: '',
      highlights: '',
    });
    const tourName = params.get('tour') || '';
    if (tourName && tours.length) {
      const match = tours.find((tour) => getRecordTitle(tour).toLowerCase() === tourName.toLowerCase());
      if (match?.id !== undefined) applyTourSelection(String(match.id));
    }
    setComposerOpen(true);
    // Intentionally open from deep-link params once data is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tours.length, rows.length, inquiries.length]);

  function documentPayload(quoteId?: string) {
    return {
      guest: form.name,
      email: form.email,
      phone: form.phone,
      tour: selected ? getRecordTitle(selected) : form.country || 'Safari quotation',
      country: form.country,
      duration: form.duration,
      guests: form.guests,
      travelDate: form.travel_date,
      tourFee: form.agreed_price,
      notes: form.message,
      highlights: form.highlights,
      expirationDays: form.expiration_days,
      quoteId,
      siteOrigin: typeof window !== 'undefined' ? window.location.origin : SITE.url,
    };
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!tourId) {
      setStatus('Select a tour package first.');
      return;
    }
    setSending(true);
    setError('');
    setStatus('');

    const tourTitle = selected ? getRecordTitle(selected) : '';
    const storedMessage = [
      form.highlights.trim() ? `PACKAGE DETAILS\n${form.highlights.trim()}` : '',
      form.message.trim() ? `GUEST NOTES\n${form.message.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    const quoteFields = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      tour: tourTitle,
      destination: form.country,
      message: storedMessage,
      guests: form.guests,
      travel_date: form.travel_date || null,
      agreed_price: form.agreed_price,
      expiration_days: form.expiration_days,
      title: `Quotation: ${tourTitle}`,
      source: 'quotation',
      status: 'Quoted',
      quoted_at: new Date().toISOString(),
      inquiry_id: inquirySource === 'inquiries' ? inquiryId || null : null,
    };

    let quoteId = '';

    if (inquiryId && inquirySource === 'quotations_inquiries') {
      const result = await saveWithColumnFallback(
        'quotations_inquiries',
        buildSavePayload('quotations_inquiries', quoteFields),
        inquiryId
      );
      if (result.error) {
        setError(result.error.message);
        setSending(false);
        return;
      }
      quoteId = inquiryId;
    } else {
      const result = await saveWithColumnFallback(
        'quotations_inquiries',
        buildSavePayload('quotations_inquiries', quoteFields)
      );
      if (result.error) {
        setError(result.error.message);
        setSending(false);
        return;
      }
      quoteId = result.data?.[0]?.id ? String(result.data[0].id) : '';
      if (!quoteId) {
        const latest = await loadOpsTable('quotations_inquiries', ['quotations']);
        const match = latest.find(
          (row) =>
            pickString(row, ['email']).toLowerCase() === form.email.trim().toLowerCase() &&
            isQuotedStatus(pickString(row, ['status']))
        );
        quoteId = match?.id ? String(match.id) : '';
      }
    }

    if (inquiryId && inquirySource === 'inquiries') {
      await saveWithColumnFallback('inquiries', { status: 'Quoted' }, inquiryId);
    } else if (form.email.trim()) {
      // Keep the legacy inquiries table in sync when the card came from quotations_inquiries.
      const match = inquiries.find(
        (row) =>
          pickString(row, ['email']).toLowerCase() === form.email.trim().toLowerCase() &&
          isPendingStatus(inquiryStatus(row))
      );
      if (match?.id !== undefined) {
        await saveWithColumnFallback('inquiries', { status: 'Quoted' }, String(match.id));
      }
    }

    await notifyAdminItemSaved({
      module: 'Quotation',
      action: 'created',
      item: { ...quoteFields, id: quoteId },
    });

    setSavedId(quoteId);

    const html = buildQuoteDocumentHtml(documentPayload(quoteId));
    await notifyWorkspace({
      title: 'Safari quotation',
      message: `Dear ${form.name}, your safari quotation for ${tourTitle || 'your tour'} is ready. View and accept it here: ${SITE.url}/quote/${quoteId || ''}`,
      category: 'inquiry',
      guestEmail: form.email,
      sendToGuest: true,
      guestTitle: `Your safari quotation from ${SITE.name}`,
      guestMessage: `Dear ${form.name},\n\nYour safari quotation for ${tourTitle} is ready.\nTour fee: ${form.agreed_price || 'As discussed'}\nAccept online: ${SITE.url}/quote/${quoteId || ''}\n\n${SITE.name}`,
      html,
      recordDashboard: true,
      emailAdmin: true,
    });

    await notifyWorkspace({
      title: 'Quotation sent',
      message: `Quotation sent to ${form.name} (${form.email}) for ${tourTitle}. Fee: ${form.agreed_price || '—'}.`,
      category: 'inquiry',
      recordDashboard: true,
      emailAdmin: false,
      sendToGuest: false,
    });

    setStatus('Quotation sent. Inquiry moved to Quoted.');
    setTab('quoted');
    setComposerOpen(false);
    setSending(false);
    await load();
  }

  function printQuote() {
    const popup = window.open('', '_blank');
    if (!popup) return;
    popup.document.write(buildQuoteDocumentHtml(documentPayload(savedId)));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  async function removeItem(row: RecordRow, sourceHint?: InquirySource) {
    const id = row.id;
    if (id === undefined || id === null || id === '') {
      setError('This item has no id and cannot be deleted.');
      return;
    }
    const label = pickString(row, ['name', 'guest_name', 'email']) || 'this item';
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;

    setDeletingId(String(id));
    setError('');
    const source =
      sourceHint ||
      ((row as InquiryCard)._source as InquirySource | undefined) ||
      'quotations_inquiries';
    const tables =
      source === 'inquiries'
        ? (['inquiries', 'contact_inquiries', 'quotations_inquiries'] as const)
        : (['quotations_inquiries', 'quotations', 'inquiries'] as const);

    let lastError = '';
    let deleted = false;
    for (const table of tables) {
      try {
        await deleteAdminRecord(table, id);
        deleted = true;
        break;
      } catch (deleteError) {
        lastError = deleteError instanceof Error ? deleteError.message : 'Delete failed';
      }
    }

    setDeletingId('');
    if (!deleted) {
      setError(lastError || 'Could not delete this item.');
      return;
    }
    await load();
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'inquiry', label: 'Inquiry', count: inquiryCards.length },
    { id: 'quoted', label: 'Quoted', count: quotedRows.length },
    { id: 'all', label: 'All Quotations', count: rows.length },
  ];

  const visibleCards: InquiryCard[] | RecordRow[] =
    tab === 'inquiry' ? inquiryCards : tab === 'quoted' ? quotedRows : rows;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-3xl font-bold text-[#111827]">Quotation & Inquiry Manager</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Website quote requests, contact messages, and agent inquiries land here. Send a one-page
            professional quotation to move an inquiry to Quoted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#4b5563] hover:bg-[#f9fafb]"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading && rows.length === 0 && inquiries.length === 0 ? (
        <p className="mt-6 text-sm text-[#6b7280]">Loading inquiries…</p>
      ) : null}

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
            {loading
              ? 'Loading…'
              : tab === 'inquiry'
                ? 'No open inquiries yet. Submit a quote request or contact form on the website, then click Refresh.'
                : tab === 'quoted'
                  ? 'No quoted items yet. Open an inquiry and click Send Quotation.'
                  : 'No quotation records found. Check that website forms are saving, then Refresh.'}
          </div>
        ) : (
          visibleCards.map((row, index) => {
            const pending = tab === 'inquiry';
            const badge = pending ? inquiryStatus(row) : pickString(row, ['status']) || 'Quoted';
            const source = sourceBadge(row);
            const receivedLabel = formatDateTime(recordReceivedAt(row));
            const quotedLabel = formatDateTime(recordQuotedAt(row));
            const sourceTable =
              pending && (row as InquiryCard)._source
                ? (row as InquiryCard)._source
                : ('quotations_inquiries' as InquirySource);
            return (
              <article
                key={`${pending ? (row as InquiryCard)._source : 'q'}-${String(row.id ?? index)}`}
                className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[#111827]">
                        {pickString(row, ['name', 'guest_name']) || 'Guest'}
                      </h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${source.className}`}>
                        {source.label}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          pending ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {badge}
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5 text-xs font-medium text-[#6b7280]">
                      {receivedLabel ? <p>Inquiry received: {receivedLabel}</p> : null}
                      {quotedLabel ? <p>Quotation sent: {quotedLabel}</p> : null}
                      {!receivedLabel && !quotedLabel ? <p>Date/time unavailable</p> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {pending ? (
                      <button
                        type="button"
                        onClick={() => fillFromInquiry(row as InquiryCard)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#6b7c3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c6b32]"
                      >
                        <FileText className="h-4 w-4" />
                        Send Quotation
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
                    <button
                      type="button"
                      onClick={() => void removeItem(row, sourceTable)}
                      disabled={deletingId === String(row.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      aria-label="Delete item"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === String(row.id) ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
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
                    <Field label="Message" value={pickString(row, ['message', 'budget']).slice(0, 120)} />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-3 py-8 sm:p-6">
          <form
            onSubmit={save}
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4 sm:px-7">
              <div>
                <h3 className="font-serif text-2xl text-[#111827]">Send Quotation</h3>
                <p className="text-xs text-[#6b7280]">One-page professional quote · no itinerary</p>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close quotation form">
                <X className="h-5 w-5 text-[#6b7280]" />
              </button>
            </div>

            {/* Document preview letterhead */}
            <QuoteLetterhead />

            <div className="space-y-4 px-5 py-5 sm:px-7">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Country
                  </label>
                  <SearchableSelect
                    value={filterCountry}
                    onChange={(value) => {
                      setFilterCountry(value);
                      setForm((current) => ({ ...current, country: value }));
                      setTourId('');
                    }}
                    options={[{ value: '', label: 'All countries' }, ...COUNTRY_OPTIONS]}
                    placeholder="Filter by country"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Duration
                  </label>
                  <select
                    value={filterDuration}
                    onChange={(event) => {
                      setFilterDuration(event.target.value);
                      setTourId('');
                    }}
                    className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
                  >
                    <option value="">All durations</option>
                    {durationOptions.map((days) => (
                      <option key={days} value={days}>
                        {days} days
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Tour package
                  </label>
                  <SearchableSelect
                    value={tourId}
                    onChange={applyTourSelection}
                    options={filteredTours.map((tour) => ({
                      value: String(tour.id),
                      label: `${getRecordTitle(tour)}${
                        pickString(tour, ['duration_days'])
                          ? ` · ${pickString(tour, ['duration_days'])}d`
                          : ''
                      }`,
                    }))}
                    placeholder="Select package"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Guest name
                  </label>
                  <input
                    required
                    placeholder="Guest name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Guest email
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="Guest email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Phone
                  </label>
                  <input
                    placeholder="Phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Travellers
                  </label>
                  <input
                    placeholder="Travellers"
                    value={form.guests}
                    onChange={(event) => setForm({ ...form, guests: event.target.value })}
                    className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Travel date
                  </label>
                  <input
                    type="date"
                    value={form.travel_date}
                    onChange={(event) => setForm({ ...form, travel_date: event.target.value })}
                    className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Validity (days)
                  </label>
                  <input
                    placeholder="Validity (days)"
                    value={form.expiration_days}
                    onChange={(event) => setForm({ ...form, expiration_days: event.target.value })}
                    className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Tour fee
                </label>
                <input
                  required
                  placeholder="e.g. 2450 or USD 2,450"
                  value={form.agreed_price}
                  onChange={(event) => setForm({ ...form, agreed_price: event.target.value })}
                  className="w-full rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2.5 text-sm font-semibold text-[#14532d]"
                />
                <p className="mt-1 text-xs text-[#6b7280]">
                  This becomes the Final Tour Fee on the booking when the guest accepts. Remaining balance is calculated from this amount.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Guest notes (from inquiry)
                </label>
                <textarea
                  placeholder="Guest message from the inquiry"
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  className="h-24 w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Package details (auto-filled · itinerary excluded)
                </label>
                <textarea
                  placeholder="Select a tour package to load full package details"
                  value={form.highlights}
                  onChange={(event) => setForm({ ...form, highlights: event.target.value })}
                  className="h-48 w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-sm leading-relaxed"
                />
                {selected ? (
                  <p className="mt-1 text-xs text-[#6b7280]">
                    Loaded from <strong>{getRecordTitle(selected)}</strong>
                    {form.country ? ` · ${form.country}` : ''}
                    {form.duration ? ` · ${form.duration}` : ''}
                  </p>
                ) : null}
              </div>

              <p className="rounded-lg bg-[#f9fafb] px-3 py-2 text-xs leading-relaxed text-[#6b7280]">
                <strong className="text-[#374151]">Terms (summary):</strong> {QUOTE_TERMS_SUMMARY}
              </p>
            </div>

            <QuoteContactFooter />

            <div className="flex flex-wrap items-center gap-3 border-t border-[#e5e7eb] px-5 py-4 sm:px-7">
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-[#6b7c3a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send Quotation'}
              </button>
              <button
                type="button"
                onClick={printQuote}
                className="rounded-lg border border-[#e5e7eb] px-4 py-2.5 text-sm font-semibold"
              >
                Print / PDF
              </button>
              {form.email ? (
                <a
                  href={gmailComposeHref(form.email, `Safari quotation from ${SITE.name}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[#e5e7eb] px-4 py-2.5 text-sm font-semibold text-[#6b7c3a]"
                >
                  Email guest
                </a>
              ) : null}
              {savedId ? (
                <Link
                  href={`/quote/${savedId}`}
                  target="_blank"
                  className="rounded-lg border border-[#e5e7eb] px-4 py-2.5 text-sm font-semibold"
                >
                  Guest quote link
                </Link>
              ) : null}
            </div>
            {status ? <p className="px-5 pb-4 text-sm text-[#6b7c3a] sm:px-7">{status}</p> : null}
            {error ? <p className="px-5 pb-4 text-sm text-red-600 sm:px-7">{error}</p> : null}
          </form>
        </div>
      )}
    </div>
  );
}
