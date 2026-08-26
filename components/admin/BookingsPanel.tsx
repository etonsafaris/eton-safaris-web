'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  CreditCard,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import SearchableSelect from '@/components/admin/SearchableSelect';
import { statusBadgeClass } from '@/components/admin/OpsRecordTable';
import { deleteAdminRecord, fetchAdminTable } from '@/lib/admin-records-client';
import { generateBookingCode } from '@/lib/booking-code';
import {
  bookingStatusAfterPayment,
  bookingTabFor,
  guestPaymentNotice,
  normalizeBookingStatus,
  normalizePaymentStatus,
  paymentStatusAfterAmount,
  paymentSummary,
  PAYMENT_STATUSES,
} from '@/lib/booking-status';
import { NAV_COUNTRIES, OTHER_DESTINATIONS, SITE } from '@/lib/collections';
import { clearCollectionCache, adminListColumnsFor, fetchCollectionRecords, getRecordTitle, pickNumber, pickRecordId, pickString } from '@/lib/data';
import { notifyWorkspace } from '@/lib/notify';
import { supabase } from '@/lib/supabase/client';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

type TabId = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'all';

function displayOrDash(value: string) {
  return value.trim() || '—';
}

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
    pickString(row, ['created_at', 'createdAt', 'created_date']) ||
    pickString(row, ['updated_at'])
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-[#4b5563]">
      <span className="font-semibold text-[#111827]">{label}:</span> {displayOrDash(value)}
    </p>
  );
}

function money(amount: number, currency = 'USD') {
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

async function loadBookings(): Promise<RecordRow[]> {
  try {
    return await fetchAdminTable('bookings');
  } catch (adminError) {
    console.warn('[Bookings] Admin API failed:', adminError);
  }
  try {
    clearCollectionCache('bookings');
    return await fetchCollectionRecords('bookings');
  } catch (clientError) {
    console.warn('[Bookings] Client fetch failed:', clientError);
    return [];
  }
}

const DESTINATION_OPTIONS = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS].map((item) => ({
  value: item.name,
  label: item.name,
}));

export default function BookingsPanel() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [tab, setTab] = useState<TabId>('pending');
  const [query, setQuery] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [detail, setDetail] = useState<RecordRow | null>(null);
  const [payments, setPayments] = useState<RecordRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState<RecordRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [form, setForm] = useState({
    guest_name: '',
    email: '',
    phone: '',
    tour: '',
    destination: '',
    travel_date: '',
    guests: '2',
    final_tour_price: '',
    message: '',
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [bookingRows, tourRows] = await Promise.all([
        loadBookings(),
        fetchAdminTable('tours').catch(() =>
          fetchCollectionRecords('tours', [], {
            columns: adminListColumnsFor('tours') || 'id,title,country,category,price,image_url',
          })
        ),
      ]);
      bookingRows.sort((a, b) => {
        const aTime = Date.parse(recordReceivedAt(a) || '') || 0;
        const bTime = Date.parse(recordReceivedAt(b) || '') || 0;
        return bTime - aTime;
      });
      setRows(bookingRows);
      setTours(tourRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load bookings.');
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const tabCounts = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, all: rows.length };
    rows.forEach((row) => {
      counts[bookingTabFor(row)] += 1;
    });
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (tab !== 'all' && bookingTabFor(row) !== tab) return false;
      if (filterDestination) {
        const dest = pickString(row, ['destination', 'country']).toLowerCase();
        if (!dest.includes(filterDestination.toLowerCase())) return false;
      }
      if (filterPayment) {
        const pay = normalizePaymentStatus(pickString(row, ['payment_status']));
        if (pay !== filterPayment) return false;
      }
      if (!needle) return true;
      const haystack = [
        pickString(row, ['guest_name', 'name']),
        pickString(row, ['email']),
        pickString(row, ['phone']),
        pickString(row, ['tour']),
        pickString(row, ['destination']),
        pickString(row, ['booking_code']),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, tab, query, filterDestination, filterPayment]);

  const stats = useMemo(() => {
    let collected = 0;
    let outstanding = 0;
    rows.forEach((row) => {
      const summary = paymentSummary(row);
      if (normalizeBookingStatus(pickString(row, ['status'])) !== 'Cancelled') {
        collected += summary.paid;
        outstanding += summary.balance;
      }
    });
    return { collected, outstanding, total: rows.length };
  }, [rows]);

  async function openDetail(record: RecordRow) {
    setDetail(record);
    setPayments([]);
    if (!record.id) return;
    setPaymentsLoading(true);
    const { data, error: paymentsError } = await supabase
      .from('pesapal_payments')
      .select('*')
      .eq('booking_id', record.id);
    if (!paymentsError && (data || []).length) {
      setPayments((data as RecordRow[]) || []);
    } else {
      const email = pickString(record, ['email']);
      if (email) {
        const fallback = await supabase.from('pesapal_payments').select('*').eq('email', email);
        setPayments((fallback.data as RecordRow[]) || []);
      }
    }
    setPaymentsLoading(false);
  }

  async function updateBooking(record: RecordRow, patch: Record<string, unknown>) {
    if (!record.id) return;
    setError('');
    const result = await saveWithColumnFallback('bookings', patch, record.id);
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    await load();
    if (detail?.id === record.id) {
      const updated = { ...record, ...patch } as RecordRow;
      setDetail(updated);
      await openDetail(updated);
    }
    return true;
  }

  async function confirmBooking(record: RecordRow) {
    const code = pickString(record, ['booking_code']) || generateBookingCode();
    const guestEmail = pickString(record, ['email']);
    const guestName = pickString(record, ['guest_name', 'name']) || guestEmail;
    const ok = await updateBooking(record, {
      status: 'Confirmed',
      booking_code: code,
    });
    if (!ok || !guestEmail.includes('@')) return;
    await notifyWorkspace({
      title: 'Booking Confirmed',
      message: `Hi ${guestName}, your safari booking is confirmed. Code: ${code}. Verify at ${SITE.url}/verify · Pay balance at ${SITE.url}/payment?booking=${record.id}`,
      category: 'booking',
      guestEmail,
      sendToGuest: true,
      guestTitle: `Your safari booking is confirmed — ${SITE.name}`,
      guestMessage: `Dear ${guestName},\n\nYour booking for ${pickString(record, ['tour'])} is confirmed.\nBooking / payment code: ${code}\nVerify (fully paid or remaining balance): ${SITE.url}/verify\nPay online: ${SITE.url}/payment?booking=${record.id}\n\n${SITE.name}`,
    });
  }

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!paymentModal?.id) return;
    const paid = Number(paymentAmount);
    if (!Number.isFinite(paid) || paid <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    setPaymentSaving(true);
    setError('');
    const summary = paymentSummary(paymentModal);
    // Never invent a final fee from the payment — use the quotation / booking Final Tour Fee.
    const total = summary.total;
    if (total <= 0) {
      setPaymentSaving(false);
      setError('Set the Final Tour Fee on this booking first (from the quotation).');
      return;
    }
    if (paid > summary.balance + 0.01) {
      setPaymentSaving(false);
      setError(`Amount cannot exceed the remaining balance (${money(summary.balance, summary.currency)}).`);
      return;
    }
    const newPaid = summary.paid + paid;
    const remaining = Math.max(0, Number((total - newPaid).toFixed(2)));
    const paymentStatus = paymentStatusAfterAmount(total, newPaid);
    const bookingStatus = bookingStatusAfterPayment(
      total,
      newPaid,
      normalizeBookingStatus(pickString(paymentModal, ['status']))
    );
    const code = pickString(paymentModal, ['booking_code']) || generateBookingCode();
    const ok = await updateBooking(paymentModal, {
      amount_paid: newPaid,
      remaining_balance: remaining,
      final_tour_price: total,
      booking_code: code,
      payment_status: paymentStatus,
      status: bookingStatus,
    });
    setPaymentSaving(false);
    if (!ok) return;
    const guestEmail = pickString(paymentModal, ['email']);
    const notice = guestPaymentNotice({
      guestName: pickString(paymentModal, ['guest_name', 'name']),
      tour: pickString(paymentModal, ['tour']),
      currency: summary.currency,
      finalTourFee: total,
      amountJustPaid: paid,
      totalPaid: newPaid,
      remainingBalance: remaining,
      bookingCode: code,
      paymentLink: `${SITE.url}/payment?booking=${paymentModal.id}`,
      verifyUrl: `${SITE.url}/verify`,
      siteName: SITE.name,
    });
    setPaymentModal(null);
    setPaymentAmount('');
    if (guestEmail.includes('@')) {
      await notifyWorkspace({
        title: notice.adminTitle,
        message: notice.adminMessage,
        category: 'booking',
        guestEmail,
        sendToGuest: true,
        guestTitle: notice.guestTitle,
        guestMessage: notice.guestMessage,
      });
    }
  }

  async function sendPaymentLink(record: RecordRow) {
    const guestEmail = pickString(record, ['email']);
    if (!guestEmail.includes('@')) {
      setError('This booking has no guest email.');
      return;
    }
    const link = `${SITE.url}/payment?booking=${record.id}`;
    const summary = paymentSummary(record);
    await notifyWorkspace({
      title: 'Safari payment link',
      message: `Pay remaining balance ${money(summary.balance, summary.currency)} for ${pickString(record, ['tour'])}: ${link}`,
      category: 'booking',
      guestEmail,
      sendToGuest: true,
      guestTitle: `Pay remaining balance ${money(summary.balance, summary.currency)} — ${SITE.name}`,
      guestMessage: `Dear ${pickString(record, ['guest_name'])},\n\nFinal tour fee: ${money(summary.total, summary.currency)}\nAmount paid: ${money(summary.paid, summary.currency)}\nRemaining balance: ${money(summary.balance, summary.currency)}\n\nPay securely:\n${link}\n\n${SITE.name}`,
    });
  }

  async function cancelBooking(record: RecordRow) {
    if (!confirm(`Cancel booking for ${pickString(record, ['guest_name'])}?`)) return;
    await updateBooking(record, { status: 'Cancelled', payment_status: pickString(record, ['payment_status']) || 'Pending Booking' });
  }

  async function completeBooking(record: RecordRow) {
    await updateBooking(record, { status: 'Completed', payment_status: 'Full Payment' });
  }

  async function removeBooking(record: RecordRow) {
    const id = pickRecordId(record);
    if (id == null) {
      setError('This booking has no id and cannot be deleted.');
      return;
    }
    const label = pickString(record, ['guest_name', 'email']) || 'this booking';
    if (!confirm(`Delete booking for ${label}? Related payment history for this booking will also be removed. This cannot be undone.`)) {
      return;
    }
    setDeletingId(String(id));
    setError('');
    try {
      await deleteAdminRecord('bookings', id);
      if (pickRecordId(detail) === id) setDetail(null);
      setRows((current) => current.filter((row) => pickRecordId(row) !== id));
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this booking.');
    }
    setDeletingId('');
  }

  async function createBooking(event: React.FormEvent) {
    event.preventDefault();
    setCreateSaving(true);
    setError('');
    const total = Number(form.final_tour_price) || 0;
    const payload = buildSavePayload('bookings', {
      guest_name: form.guest_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      tour: form.tour.trim(),
      destination: form.destination.trim(),
      travel_date: form.travel_date || null,
      guests: Number(form.guests) || 1,
      message: form.message.trim(),
      status: 'Pending',
      payment_status: 'Pending Booking',
      booking_code: generateBookingCode(),
      final_tour_price: total || null,
      amount_paid: 0,
      remaining_balance: total || null,
    });
    const result = await saveWithColumnFallback('bookings', payload);
    setCreateSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setCreateOpen(false);
    setForm({
      guest_name: '',
      email: '',
      phone: '',
      tour: '',
      destination: '',
      travel_date: '',
      guests: '2',
      final_tour_price: '',
      message: '',
    });
    await load();
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: tabCounts.pending },
    { id: 'confirmed', label: 'Confirmed', count: tabCounts.confirmed },
    { id: 'completed', label: 'Completed', count: tabCounts.completed },
    { id: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled },
    { id: 'all', label: 'All Bookings', count: tabCounts.all },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-3xl font-bold text-[#111827]">Booking Manager</h2>
          <p className="mt-1 max-w-3xl text-sm text-[#6b7280]">
            Tour bookings from the website, accepted quotations, agent guests, and Pesapal payments.
            Confirm bookings, record down payments, and track balances — same workflow as Dav Safaris.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6b7c3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c6b32]"
          >
            <Plus className="h-4 w-4" />
            Add Booking
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#4b5563] hover:bg-[#f9fafb]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total bookings', value: stats.total.toLocaleString(), tone: 'text-[#111827]' },
          { label: 'Pending review', value: tabCounts.pending.toLocaleString(), tone: 'text-amber-700' },
          { label: 'Collected (USD)', value: money(stats.collected), tone: 'text-[#006400]' },
          { label: 'Outstanding balance', value: money(stats.outstanding), tone: 'text-[#8f2742]' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[#d1fae5] bg-[#f0fdf4] p-4 text-sm text-[#14532d]">
        <p className="font-semibold">How bookings work</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Guest books a tour or accepts a quotation → lands here as <strong>Pending</strong>.</li>
          <li>Guest pays via Pesapal or you record a down payment → status moves to <strong>Confirmed</strong>.</li>
          <li>Share the payment link for remaining balance; guest verifies with booking code at <Link href="/verify" className="underline">/verify</Link>.</li>
          <li>Mark <strong>Completed</strong> after travel; use <strong>Cancelled</strong> if the trip does not proceed.</li>
        </ol>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

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

      <div className="mt-5 grid gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-3 sm:grid-cols-[180px_180px_1fr]">
        <SearchableSelect
          value={filterDestination}
          onChange={setFilterDestination}
          options={[{ value: '', label: 'All destinations' }, ...DESTINATION_OPTIONS]}
          placeholder="Destination"
        />
        <select
          value={filterPayment}
          onChange={(event) => setFilterPayment(event.target.value)}
          className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5 text-sm outline-none focus:border-[#6b7c3a]"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guest, email, tour, booking code…"
          className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-2.5 text-sm outline-none focus:border-[#6b7c3a]"
        />
      </div>

      <div className="mt-5 space-y-4">
        {loading && rows.length === 0 ? (
          <p className="text-sm text-[#6b7280]">Loading bookings…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white py-12 text-center text-sm text-[#6b7280]">
            No bookings in this view. New tour bookings and accepted quotes appear here automatically.
          </div>
        ) : (
          filtered.map((row, index) => {
            const summary = paymentSummary(row);
            const received = formatDateTime(recordReceivedAt(row));
            const bookingCode = pickString(row, ['booking_code']);
            return (
              <article
                key={String(row.id ?? index)}
                className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[#111827]">
                        {pickString(row, ['guest_name', 'name']) || 'Guest'}
                      </h3>
                      {bookingCode ? (
                        <span className="rounded-full bg-[#111827] px-2.5 py-0.5 font-mono text-xs font-semibold text-white">
                          {bookingCode}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(summary.bookingStatus)}`}
                      >
                        {summary.bookingStatus}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(summary.paymentStatus)}`}
                      >
                        {summary.paymentStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-[#6b7280]">
                      {received ? `Received: ${received}` : 'Date unavailable'}
                      {pickString(row, ['travel_date']) ? ` · Travel: ${pickString(row, ['travel_date']).slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void openDetail(row)}
                      className="rounded-lg border border-[#6b7c3a] px-3 py-2 text-sm font-semibold text-[#6b7c3a] hover:bg-[#6b7c3a]/5"
                    >
                      View details
                    </button>
                    {summary.bookingStatus === 'Pending' ? (
                      <button
                        type="button"
                        onClick={() => void confirmBooking(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#6b7c3a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#5c6b32]"
                      >
                        <CalendarCheck className="h-4 w-4" />
                        Confirm Booking
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentModal(row);
                        setPaymentAmount('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm font-semibold text-[#4b5563] hover:bg-[#f9fafb]"
                    >
                      <CreditCard className="h-4 w-4" />
                      Record Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendPaymentLink(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm font-semibold text-[#4b5563] hover:bg-[#f9fafb]"
                    >
                      <Mail className="h-4 w-4" />
                      Payment link
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeBooking(row)}
                      disabled={deletingId === String(row.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === String(row.id) ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Field label="Email" value={pickString(row, ['email'])} />
                    <Field label="Phone" value={pickString(row, ['phone'])} />
                    <Field label="Guests" value={String(pickNumber(row, ['guests'], 0) || pickString(row, ['guests']) || '—')} />
                  </div>
                  <div className="space-y-1.5">
                    <Field label="Tour" value={pickString(row, ['tour'])} />
                    <Field label="Destination" value={pickString(row, ['destination', 'country'])} />
                    <Field label="Agent" value={pickString(row, ['agent_email'])} />
                  </div>
                  <div className="rounded-lg border border-[#eef0f3] bg-[#f8fafc] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Payment summary</p>
                    <dl className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-[#6b7280]">Tour fee</dt>
                        <dd className="font-semibold text-[#111827]">{money(summary.total, summary.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6b7280]">Paid</dt>
                        <dd className="font-semibold text-[#006400]">{money(summary.paid, summary.currency)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-[#e5e7eb] pt-1">
                        <dt className="text-[#6b7280]">Balance</dt>
                        <dd className="font-semibold text-[#8f2742]">{money(summary.balance, summary.currency)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-8">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
              <div>
                <h3 className="font-serif text-2xl text-[#111827]">Booking details</h3>
                <p className="font-mono text-sm text-[#6b7280]">{pickString(detail, ['booking_code']) || 'No code yet'}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Close">
                <X className="h-5 w-5 text-[#6b7280]" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {(() => {
                const summary = paymentSummary(detail);
                return (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(summary.bookingStatus)}`}>
                        {summary.bookingStatus}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(summary.paymentStatus)}`}>
                        {summary.paymentStatus}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Guest" value={pickString(detail, ['guest_name', 'name'])} />
                      <Field label="Email" value={pickString(detail, ['email'])} />
                      <Field label="Phone" value={pickString(detail, ['phone'])} />
                      <Field label="Country" value={pickString(detail, ['country'])} />
                      <Field label="Tour" value={pickString(detail, ['tour'])} />
                      <Field label="Destination" value={pickString(detail, ['destination'])} />
                      <Field label="Travel date" value={pickString(detail, ['travel_date']).slice(0, 10)} />
                      <Field label="Guests" value={pickString(detail, ['guests'])} />
                    </div>
                    {pickString(detail, ['travel_plans']) ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Travel plans</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-[#4b5563]">{pickString(detail, ['travel_plans'])}</p>
                      </div>
                    ) : null}
                    {pickString(detail, ['message']) ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Notes</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-[#4b5563]">{pickString(detail, ['message'])}</p>
                      </div>
                    ) : null}
                    <div className="rounded-lg border border-[#eef0f3] bg-[#f8fafc] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Payment</p>
                      <p className="mt-2 text-sm">
                        Fee {money(summary.total, summary.currency)} · Paid {money(summary.paid, summary.currency)} · Balance{' '}
                        {money(summary.balance, summary.currency)}
                      </p>
                      <Link
                        href={`/payment?booking=${detail.id}`}
                        target="_blank"
                        className="mt-2 inline-block text-sm font-semibold text-[#6b7c3a] underline"
                      >
                        Open guest payment portal
                      </Link>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Pesapal payment history</p>
                      {paymentsLoading ? (
                        <p className="mt-2 text-sm text-[#6b7280]">Loading…</p>
                      ) : payments.length === 0 ? (
                        <p className="mt-2 text-sm text-[#6b7280]">No online payments recorded yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {payments.map((payment, paymentIndex) => (
                            <li
                              key={String(payment.id ?? paymentIndex)}
                              className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm"
                            >
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(pickString(payment, ['status']))}`}>
                                {pickString(payment, ['status']) || 'Pending'}
                              </span>{' '}
                              {money(
                                pickNumber(payment, ['pesapal_amount', 'amount', 'total_amount'], 0),
                                pickString(payment, ['currency']) || 'USD'
                              )}{' '}
                              · Ref {pickString(payment, ['reference', 'order_tracking_id'])}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-[#e5e7eb] pt-4">
                      {summary.bookingStatus === 'Pending' ? (
                        <button
                          type="button"
                          onClick={() => void confirmBooking(detail)}
                          className="rounded-lg bg-[#6b7c3a] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Confirm Booking
                        </button>
                      ) : null}
                      {summary.bookingStatus === 'Confirmed' ? (
                        <button
                          type="button"
                          onClick={() => void completeBooking(detail)}
                          className="rounded-lg border border-[#6b7c3a] px-4 py-2 text-sm font-semibold text-[#6b7c3a]"
                        >
                          Mark completed
                        </button>
                      ) : null}
                      {summary.bookingStatus !== 'Cancelled' ? (
                        <button
                          type="button"
                          onClick={() => void cancelBooking(detail)}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                        >
                          Cancel booking
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void removeBooking(detail)}
                        disabled={deletingId === String(pickRecordId(detail))}
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                      >
                        {deletingId === String(pickRecordId(detail)) ? 'Deleting…' : 'Delete booking'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form onSubmit={recordPayment} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-[#111827]">Record payment</h3>
              <button type="button" onClick={() => setPaymentModal(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-[#6b7280]">
              {pickString(paymentModal, ['guest_name'])} · Balance{' '}
              {money(paymentSummary(paymentModal).balance, paymentSummary(paymentModal).currency)}
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Amount received
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={paymentSaving}
              className="mt-4 w-full rounded-lg bg-[#6b7c3a] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {paymentSaving ? 'Saving…' : 'Save payment'}
            </button>
          </form>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-8">
          <form onSubmit={createBooking} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-[#111827]">Add booking</h3>
              <button type="button" onClick={() => setCreateOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Guest name"
                value={form.guest_name}
                onChange={(event) => setForm({ ...form, guest_name: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm sm:col-span-2"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <SearchableSelect
                value={form.destination}
                onChange={(value) => setForm({ ...form, destination: value })}
                options={[{ value: '', label: 'Destination' }, ...DESTINATION_OPTIONS]}
                placeholder="Destination"
              />
              <SearchableSelect
                value={form.tour}
                onChange={(value) => setForm({ ...form, tour: value })}
                options={[
                  { value: '', label: 'Select tour (optional)' },
                  ...tours.map((tour) => ({ value: getRecordTitle(tour), label: getRecordTitle(tour) })),
                ]}
                placeholder="Tour package"
              />
              <input
                type="date"
                value={form.travel_date}
                onChange={(event) => setForm({ ...form, travel_date: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Guests"
                value={form.guests}
                onChange={(event) => setForm({ ...form, guests: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Tour fee (USD)"
                value={form.final_tour_price}
                onChange={(event) => setForm({ ...form, final_tour_price: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <textarea
                placeholder="Notes / travel plans"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                className="min-h-[80px] rounded-lg border px-3 py-2.5 text-sm sm:col-span-2"
              />
            </div>
            <button
              type="submit"
              disabled={createSaving}
              className="mt-4 w-full rounded-lg bg-[#6b7c3a] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createSaving ? 'Creating…' : 'Create booking'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
