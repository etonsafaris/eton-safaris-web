import { pickNumber, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

/** Canonical booking lifecycle statuses (admin + verify page). */
export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Canonical payment statuses (Pesapal + admin panel). */
export const PAYMENT_STATUSES = [
  'Pending Booking',
  'Down Payment Received',
  'Partial Payment',
  'Full Payment',
  'Fully Paid',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Parse a tour fee from quotation text like "USD 2,450" or "2450 per person". */
export function parseMoneyAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const match = raw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const amount = Number(match[0]);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

/** Final tour fee from a quotation record (agreed_price first). */
export function quoteFinalTourFee(quote: Record<string, unknown> | RecordRow | null | undefined): number {
  if (!quote) return 0;
  return (
    parseMoneyAmount(quote.agreed_price) ||
    parseMoneyAmount(quote.total_price) ||
    parseMoneyAmount(quote.base_price) ||
    parseMoneyAmount(quote.tour_fee) ||
    0
  );
}

export function formatMoneyAmount(amount: number, currency = 'USD') {
  if (!Number.isFinite(amount)) return `${currency} 0.00`;
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Guest email copy after a payment against the booking's final tour fee. */
export function guestPaymentNotice(input: {
  guestName: string;
  tour: string;
  currency?: string;
  finalTourFee: number;
  amountJustPaid: number;
  totalPaid: number;
  remainingBalance: number;
  bookingCode?: string;
  paymentLink?: string;
  verifyUrl?: string;
  siteName?: string;
}) {
  const currency = input.currency || 'USD';
  const name = input.guestName.trim() || 'Guest';
  const tour = input.tour.trim() || 'your safari';
  const site = input.siteName || 'Eton Safaris';
  const fee = formatMoneyAmount(input.finalTourFee, currency);
  const justPaid = formatMoneyAmount(input.amountJustPaid, currency);
  const totalPaid = formatMoneyAmount(input.totalPaid, currency);
  const remaining = formatMoneyAmount(input.remainingBalance, currency);
  const completed = input.remainingBalance <= 0.009;

  if (completed) {
    return {
      adminTitle: 'Safari fee completed — Full Payment',
      adminMessage: `${name} completed the final tour fee for ${tour}. Paid ${justPaid}. Total paid ${totalPaid} of ${fee}.`,
      guestTitle: `Thank you — your safari fee is complete · ${site}`,
      guestMessage: [
        `Dear ${name},`,
        '',
        `Thank you for completing your safari payment for ${tour}.`,
        '',
        `Final tour fee: ${fee}`,
        `Amount just paid: ${justPaid}`,
        `Total paid: ${totalPaid}`,
        `Remaining balance: ${formatMoneyAmount(0, currency)}`,
        input.bookingCode ? `Booking / payment code: ${input.bookingCode}` : '',
        input.verifyUrl ? `Verify your booking: ${input.verifyUrl}` : '',
        '',
        `We look forward to hosting you. If you need anything, reply to this email.`,
        '',
        site,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  return {
    adminTitle: 'Partial safari payment received',
    adminMessage: `${name} paid ${justPaid} for ${tour}. Total paid ${totalPaid} of ${fee}. Remaining balance: ${remaining}.`,
    guestTitle: `Payment received — remaining balance ${remaining} · ${site}`,
    guestMessage: [
      `Dear ${name},`,
      '',
      `Thank you. We received your partial payment for ${tour}.`,
      '',
      `Final tour fee: ${fee}`,
      `Amount just paid: ${justPaid}`,
      `Total paid so far: ${totalPaid}`,
      `Remaining balance: ${remaining}`,
      input.bookingCode ? `Booking / payment code: ${input.bookingCode}` : '',
      input.verifyUrl ? `Verify anytime: ${input.verifyUrl}` : '',
      input.paymentLink ? `\nPay the remaining balance securely here:\n${input.paymentLink}` : '',
      '',
      `Please settle the remaining balance before travel.`,
      '',
      site,
    ]
      .filter((line) => line !== '')
      .join('\n'),
  };
}

/** Email issued when a booking/payment code is first created for a guest. */
export function guestBookingCodeNotice(input: {
  guestName: string;
  tour: string;
  bookingCode: string;
  verifyUrl: string;
  paymentLink?: string;
  siteName?: string;
}) {
  const name = input.guestName.trim() || 'Guest';
  const tour = input.tour.trim() || 'your safari';
  const site = input.siteName || 'Eton Safaris';
  return {
    guestTitle: `Your safari booking code is ${input.bookingCode} · ${site}`,
    guestMessage: [
      `Dear ${name},`,
      '',
      `Your safari booking for ${tour} has been recorded.`,
      '',
      `Booking / payment code: ${input.bookingCode}`,
      `Use this code at ${input.verifyUrl} to check whether you are fully paid or still have a remaining balance.`,
      input.paymentLink ? `\nPay securely:\n${input.paymentLink}` : '',
      '',
      site,
    ]
      .filter((line) => line !== '')
      .join('\n'),
  };
}

export function normalizeBookingStatus(raw: string): BookingStatus {
  const value = raw.trim().toLowerCase();
  if (!value || value === 'pending' || value === 'pending booking' || value === 'new') return 'Pending';
  if (/cancel/.test(value)) return 'Cancelled';
  if (/complete/.test(value)) return 'Completed';
  if (/confirm|active|partial payment|down payment/.test(value)) return 'Confirmed';
  return 'Pending';
}

export function normalizePaymentStatus(raw: string): PaymentStatus {
  const value = raw.trim().toLowerCase();
  if (!value || value === 'pending' || value === 'pending booking') return 'Pending Booking';
  if (/fully paid|full payment/.test(value)) return 'Full Payment';
  if (/down payment/.test(value)) return 'Down Payment Received';
  if (/partial/.test(value)) return 'Partial Payment';
  return 'Pending Booking';
}

export function bookingTabFor(record: RecordRow): 'pending' | 'confirmed' | 'completed' | 'cancelled' {
  const status = normalizeBookingStatus(pickString(record, ['status']));
  if (status === 'Cancelled') return 'cancelled';
  if (status === 'Completed') return 'completed';
  if (status === 'Confirmed') return 'confirmed';
  return 'pending';
}

export function isPendingBooking(record: RecordRow) {
  return bookingTabFor(record) === 'pending';
}

export function paymentSummary(record: RecordRow) {
  const total =
    parseMoneyAmount(record.final_tour_price) ||
    parseMoneyAmount(record.total_amount) ||
    parseMoneyAmount(record.total_price) ||
    parseMoneyAmount(record.amount) ||
    pickNumber(record, ['final_tour_price', 'total_amount', 'total_price', 'amount'], 0);
  const paid = parseMoneyAmount(record.amount_paid) || pickNumber(record, ['amount_paid'], 0);
  // Remaining balance is always derived from Final Tour Fee − amount paid.
  const balance = Math.max(0, Number((total - paid).toFixed(2)));
  const paymentStatus = normalizePaymentStatus(
    pickString(record, ['payment_status']) || pickString(record, ['status'])
  );
  const bookingStatus = normalizeBookingStatus(pickString(record, ['status']));
  const currency = pickString(record, ['currency']) || 'USD';
  return { total, paid, balance, paymentStatus, bookingStatus, currency };
}

export function paymentStatusAfterAmount(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'Pending Booking';
  if (total > 0 && paid >= total - 0.009) return 'Full Payment';
  if (total > 0 && paid >= total * 0.25) return 'Down Payment Received';
  return 'Partial Payment';
}

export function bookingStatusAfterPayment(total: number, paid: number, current: BookingStatus): BookingStatus {
  if (current === 'Cancelled' || current === 'Completed') return current;
  if (paid > 0) return 'Confirmed';
  return current;
}

export function verifyStatusLabel(record: RecordRow) {
  const { bookingStatus, paymentStatus } = paymentSummary(record);
  if (bookingStatus === 'Cancelled') return 'BOOKING CANCELLED';
  if (bookingStatus === 'Completed') return 'SAFARI COMPLETED';
  if (paymentStatus === 'Full Payment' || paymentStatus === 'Fully Paid') return 'BOOKING CONFIRMED — FULLY PAID';
  if (paymentStatus === 'Down Payment Received' || paymentStatus === 'Partial Payment') {
    return 'BOOKING CONFIRMED — BALANCE DUE';
  }
  if (bookingStatus === 'Confirmed') return 'BOOKING CONFIRMED';
  return 'BOOKING PENDING CONFIRMATION';
}

export function verifyStatusClass(record: RecordRow) {
  const { bookingStatus, paymentStatus } = paymentSummary(record);
  if (bookingStatus === 'Cancelled') return 'bg-red-700';
  if (bookingStatus === 'Completed') return 'bg-[#006400]';
  if (bookingStatus === 'Confirmed' || paymentStatus !== 'Pending Booking') return 'bg-[#006400]';
  return 'bg-amber-600';
}
