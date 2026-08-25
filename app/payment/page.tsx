'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Mail, Smartphone, User } from 'lucide-react';
import PaymentPortalShell from '@/components/public/PaymentPortalShell';
import { supabase } from '@/lib/supabase/client';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyWorkspace } from '@/lib/notify';
import Honeypot, { isSpamHoneypot } from '@/components/public/Honeypot';
import MathCaptcha from '@/components/public/MathCaptcha';
import { generateBookingCode } from '@/lib/booking-code';
import { guestBookingCodeNotice, parseMoneyAmount } from '@/lib/booking-status';
import { SITE } from '@/lib/collections';

type Step = 1 | 2 | 3;

const SALUTATIONS = ['Mr.', 'Mrs.', 'Miss.', 'Dr.', 'Prof.'];
const CURRENCIES = ['USD', 'UGX', 'KES', 'EUR', 'GBP', 'TZS'];

function fieldClass(disabled = false) {
  return `w-full border border-[#ddd] bg-white px-3 py-2.5 text-sm text-[#333] outline-none focus:border-[#8f2742] ${disabled ? 'bg-[#fafafa]' : ''}`;
}

function iconField(children: React.ReactNode) {
  return (
    <div className="relative">
      {children}
    </div>
  );
}

function PaymentPortalInner() {
  const searchParams = useSearchParams();
  const returned = searchParams?.get('status') === 'complete' || Boolean(searchParams?.get('OrderTrackingId'));
  const trackingId = searchParams?.get('OrderTrackingId') || '';
  const merchantRef = searchParams?.get('OrderMerchantReference') || '';

  const [step, setStep] = useState<Step>(returned ? 3 : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState(merchantRef);
  const [bookingId, setBookingId] = useState(searchParams?.get('booking') || '');
  const [bookingCode, setBookingCode] = useState('');
  const [lockedTotal, setLockedTotal] = useState<number | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);
  const [form, setForm] = useState({
    salutation: 'Mr.',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    tour: searchParams?.get('tour') || '',
    amount: '',
    currency: 'USD',
    description: '',
  });

  useEffect(() => {
    if (!trackingId) return;
    fetch(`/api/pesapal/ipn?OrderTrackingId=${encodeURIComponent(trackingId)}`)
      .then((response) => response.json())
      .then((body) => {
        if (body.reference) setReference(String(body.reference));
      })
      .catch((err) => console.error('[Pesapal] Status check failed:', err));
  }, [trackingId]);

  useEffect(() => {
    if (!bookingId) return;
    supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const total = parseMoneyAmount(data.final_tour_price) || parseMoneyAmount(data.total_price);
        const paid = parseMoneyAmount(data.amount_paid);
        const due = Math.max(0, Number((total - paid).toFixed(2)));
        const guestName = String(data.guest_name || '').trim();
        const parts = guestName.split(/\s+/);
        setLockedTotal(total > 0 ? total : null);
        setAlreadyPaid(paid);
        setBookingCode(String(data.booking_code || ''));
        setForm((current) => ({
          ...current,
          first_name: parts[0] || current.first_name,
          last_name: parts.slice(1).join(' ') || current.last_name,
          email: String(data.email || current.email),
          phone: String(data.phone || current.phone),
          tour: String(data.tour || current.tour),
          description: String(data.tour || current.description),
          amount: due > 0 ? String(due) : current.amount,
        }));
      });
  }, [bookingId]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault();
    if (isSpamHoneypot(honeypot)) return;
    if (!acceptedTerms) {
      setError('Please accept the terms and conditions.');
      return;
    }
    if (!captchaOk) {
      setError('Complete the security check before continuing.');
      return;
    }

    const amount = Number.parseFloat(form.amount);
    const total = lockedTotal ?? amount;
    const guestName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();

    if (!guestName || !form.email.includes('@') || !form.phone.trim()) {
      setError('Enter your name, email, and mobile number.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (lockedTotal !== null) {
      const due = Math.max(0, lockedTotal - alreadyPaid);
      if (amount > due + 0.01) {
        setError('Amount cannot exceed the remaining balance on this booking.');
        return;
      }
    }

    setSaving(true);
    setError('');
    setStep(2);

    const ref = `ETON-${Date.now()}`;
    let activeBookingId = bookingId;
    let activeBookingCode = bookingCode;

    if (!activeBookingId) {
      activeBookingCode = generateBookingCode();
      const bookingPayload = buildSavePayload('bookings', {
        guest_name: guestName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        tour: form.tour || form.description,
        status: 'Pending',
        payment_status: 'Pending Booking',
        final_tour_price: total,
        amount_paid: 0,
        remaining_balance: total,
        booking_code: activeBookingCode,
      });
      const inserted = await saveWithColumnFallback('bookings', bookingPayload);
      activeBookingId = String(inserted.data?.[0]?.id || '');
      if (activeBookingId) setBookingId(activeBookingId);
      if (activeBookingCode) setBookingCode(activeBookingCode);
    }

    if (!activeBookingCode && activeBookingId) {
      const { data: existing } = await supabase.from('bookings').select('booking_code').eq('id', activeBookingId).maybeSingle();
      activeBookingCode = String(existing?.booking_code || '');
      if (!activeBookingCode) {
        activeBookingCode = generateBookingCode();
        await saveWithColumnFallback('bookings', { booking_code: activeBookingCode }, activeBookingId);
      }
      setBookingCode(activeBookingCode);
    }

    const payload = buildSavePayload('pesapal_payments', {
      reference: ref,
      email: form.email.trim(),
      amount,
      currency: form.currency,
      tour: form.tour || form.description,
      payment_type: 'full',
      total_amount: total,
      remaining_balance: Math.max(0, total - amount),
      booking_id: activeBookingId || null,
      status: 'Pending',
    });
    await saveWithColumnFallback('pesapal_payments', payload);

    if (activeBookingCode) {
      const codeNotice = guestBookingCodeNotice({
        guestName,
        tour: form.tour || form.description || 'your safari',
        bookingCode: activeBookingCode,
        verifyUrl: `${SITE.url}/verify`,
        paymentLink: activeBookingId ? `${SITE.url}/payment?booking=${activeBookingId}` : `${SITE.url}/payment`,
        siteName: SITE.name,
      });
      await notifyWorkspace({
        title: 'Payment initiated',
        message: `${guestName} (${form.email}) started a ${form.currency} ${amount.toFixed(2)} Pesapal checkout. Booking code ${activeBookingCode}. Ref ${ref}.`,
        category: 'booking',
        guestEmail: form.email.trim(),
        sendToGuest: true,
        guestTitle: codeNotice.guestTitle,
        guestMessage: `${codeNotice.guestMessage}\n\nPayment reference: ${ref}`,
      });
    } else {
      await notifyWorkspace({
        title: 'Payment initiated',
        message: `${guestName} (${form.email}) started a ${form.currency} ${amount.toFixed(2)} Pesapal checkout. Ref ${ref}.`,
        category: 'booking',
      });
    }

    try {
      const response = await fetch('/api/pesapal/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: form.currency,
          email: form.email.trim(),
          phone: form.phone.trim(),
          name: guestName,
          description: form.description || form.tour || 'Eton Safaris safari payment',
          reference: ref,
          bookingId: activeBookingId || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setStep(1);
        setError(String(body.error || 'Pesapal checkout failed. Check the live merchant keys and try again.'));
        setSaving(false);
        return;
      }
      if (body.redirect_url) {
        window.location.href = String(body.redirect_url);
        return;
      }
      setStep(1);
      setError('Pesapal did not return a checkout URL.');
    } catch (err) {
      setStep(1);
      setError(err instanceof Error ? err.message : 'Could not reach Pesapal.');
    }

    setReference(ref);
    setSaving(false);
  }

  return (
    <PaymentPortalShell step={step}>
      {error && (
        <p className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {step === 1 && (
        <form onSubmit={submitPayment} className="relative border border-[#e5e5e5] bg-white p-5 sm:p-8">
          <Honeypot value={honeypot} onChange={setHoneypot} />
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm text-[#555]">
              Salutation
              <select
                value={form.salutation}
                onChange={(event) => update('salutation', event.target.value)}
                className={`${fieldClass()} mt-1`}
              >
                {SALUTATIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-[#555]">
              First Name <span className="text-[#8f2742]">*</span>
              {iconField(
                <>
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" />
                  <input
                    required
                    value={form.first_name}
                    onChange={(event) => update('first_name', event.target.value)}
                    className={`${fieldClass()} mt-1 pl-9`}
                  />
                </>
              )}
            </label>
            <label className="block text-sm text-[#555]">
              Last Name <span className="text-[#8f2742]">*</span>
              {iconField(
                <>
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" />
                  <input
                    required
                    value={form.last_name}
                    onChange={(event) => update('last_name', event.target.value)}
                    className={`${fieldClass()} mt-1 pl-9`}
                  />
                </>
              )}
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-[#555]">
              Email <span className="text-[#8f2742]">*</span>
              {iconField(
                <>
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    className={`${fieldClass()} mt-1 pl-9`}
                  />
                </>
              )}
            </label>
            <label className="block text-sm text-[#555]">
              Mobile <span className="text-[#8f2742]">*</span>
              {iconField(
                <>
                  <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" />
                  <input
                    required
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    className={`${fieldClass()} mt-1 pl-9`}
                  />
                </>
              )}
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm text-[#555] sm:col-span-1">
              Currency <span className="text-[#8f2742]">*</span>
              <select
                value={form.currency}
                onChange={(event) => update('currency', event.target.value)}
                className={`${fieldClass()} mt-1`}
              >
                {CURRENCIES.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-[#555] sm:col-span-2">
              Amount <span className="text-[#8f2742]">*</span>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={(event) => update('amount', event.target.value)}
                className={`${fieldClass()} mt-1`}
              />
            </label>
          </div>

          {lockedTotal !== null && (
            <div className="mt-4 rounded border border-[#eee] bg-[#fafafa] px-4 py-3 text-sm text-[#555]">
              <p>Total booking: {form.currency} {lockedTotal.toFixed(2)}</p>
              <p>Already paid: {form.currency} {alreadyPaid.toFixed(2)}</p>
              <p className="font-semibold">
                Remaining: {form.currency} {Math.max(0, lockedTotal - alreadyPaid).toFixed(2)}
              </p>
            </div>
          )}

          <label className="mt-4 block text-sm text-[#555]">
            Description <span className="text-[#8f2742]">*</span>
            {iconField(
              <>
                <Mail className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-[#aaa]" />
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  placeholder={form.tour || 'Safari payment details'}
                  className={`${fieldClass()} mt-1 resize-none pl-9`}
                />
              </>
            )}
          </label>

          <div className="mt-4">
            <MathCaptcha onValidChange={setCaptchaOk} />
          </div>

          <label className="mt-5 flex items-start gap-2 text-sm text-[#555]">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-1"
            />
            <span>
              I have read and accepted{' '}
              <Link href="/terms-of-services" className="font-semibold text-[#1a73e8] hover:underline">
                {SITE.name.toUpperCase()} terms &amp; conditions
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={saving || !acceptedTerms}
            className="mt-6 w-full bg-[#e8837a] py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#d96f66] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
          >
            {saving ? 'Opening Pesapal…' : 'Make Payment'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="border border-[#e5e5e5] bg-white p-8 text-center">
          <p className="text-lg font-semibold text-[#333]">Redirecting to Pesapal…</p>
          <p className="mt-2 text-sm text-[#666]">Complete your payment on the secure Pesapal page.</p>
        </div>
      )}

      {step === 3 && (
        <div className="border border-[#e5e5e5] bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#8f2742]/10 text-[#8f2742]">
            <Check className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[#333]">Confirmation</h2>
          <p className="mt-3 text-sm text-[#666]">
            {returned
              ? 'Pesapal returned you to Eton Safaris. Payment status updates after Pesapal confirms the transaction.'
              : 'Your payment request has been recorded as pending until Pesapal confirms it.'}
          </p>
          {reference && <p className="mt-4 text-sm font-semibold text-[#8f2742]">Reference: {reference}</p>}
          {trackingId && <p className="mt-1 text-xs text-[#888]">Tracking: {trackingId}</p>}
          <Link
            href="/"
            className="mt-8 inline-flex bg-[#8f2742] px-6 py-3 text-sm font-semibold uppercase text-white hover:bg-[#742036]"
          >
            Back to home
          </Link>
        </div>
      )}
    </PaymentPortalShell>
  );
}

export default function PaymentPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f3f3] py-24 text-center text-gray-500">Loading payment…</div>}>
      <PaymentPortalInner />
    </Suspense>
  );
}
